import path from 'node:path';

const PACKAGE_INTERNAL_IMPORT_PATTERN =
  /(?:from\s+|import\s*\(\s*|import\s*)['"](?<specifier>#[^'"]+)['"]/gu;

function parsePackageFilesFromPackJson(stdout) {
  let packResults;
  try {
    packResults = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Could not parse npm pack --json output: ${error.message}`);
  }

  const files = packResults?.[0]?.files;
  if (!Array.isArray(files)) {
    throw new Error('npm pack --json output did not include a file list.');
  }

  return files.map((file) => file.path).sort();
}

function resolvePackageInternalImport(specifier, imports) {
  const exactTarget = imports?.[specifier];
  if (typeof exactTarget === 'string') {
    return exactTarget.replace(/^\.\//u, '');
  }

  for (const [pattern, target] of Object.entries(imports ?? {})) {
    if (!pattern.endsWith('/*') || typeof target !== 'string' || !target.endsWith('/*')) {
      continue;
    }

    const prefix = pattern.slice(0, -1);
    if (!specifier.startsWith(prefix)) {
      continue;
    }

    return `${target.slice(0, -1)}${specifier.slice(prefix.length)}`.replace(/^\.\//u, '');
  }

  return null;
}

function collectPackageInternalImports(source) {
  const specifiers = [];
  for (const match of source.matchAll(PACKAGE_INTERNAL_IMPORT_PATTERN)) {
    specifiers.push(match.groups.specifier);
  }

  return specifiers;
}

async function readPackageJson(repoRoot, readText) {
  return JSON.parse(await readText(path.join(repoRoot, 'package.json')));
}

export async function assertPackagedInternalImportsResolvable({
  execCommand,
  log = console.log,
  readText,
  repoRoot,
}) {
  log('\n== Package internal import integrity ==');
  const packageJson = await readPackageJson(repoRoot, readText);
  const packResult = await execCommand('npm', ['pack', '--dry-run', '--json'], {
    silent: true,
  });
  const packageFiles = parsePackageFilesFromPackJson(packResult.stdout);
  const packageFileSet = new Set(packageFiles);
  const sourceFiles = packageFiles.filter((file) => /\.(?:cjs|js|mjs)$/u.test(file));
  const missing = [];

  for (const file of sourceFiles) {
    const source = await readText(path.join(repoRoot, file));
    for (const specifier of collectPackageInternalImports(source)) {
      const target = resolvePackageInternalImport(specifier, packageJson.imports);
      if (!target) {
        missing.push(`${file} imports ${specifier}, but package.json#imports has no match`);
        continue;
      }

      if (!packageFileSet.has(target)) {
        missing.push(`${file} imports ${specifier}, but ${target} is not packaged`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Packaged internal imports are not resolvable:\n- ${missing.join('\n- ')}`);
  }

  log(`ok: ${sourceFiles.length} packaged JS file(s) have resolvable internal imports`);
}
