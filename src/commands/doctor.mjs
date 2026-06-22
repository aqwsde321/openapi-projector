import { runDoctor } from './doctor/run.mjs';

const doctorCommand = {
  name: 'doctor',
  run: runDoctor,
};

export {
  doctorCommand,
  runDoctor,
};
