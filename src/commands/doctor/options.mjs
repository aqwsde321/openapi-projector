function parseDoctorArgs(argv) {
  return {
    checkUrl: argv.includes('--check-url'),
  };
}

export { parseDoctorArgs };
