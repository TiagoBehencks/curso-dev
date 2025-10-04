import { exec, spawn } from 'node:child_process'

function cleanDatabase() {
  process.stdout.write('Wrapping script...')

  spawn('npm', ['run', 'wrap:dev'], {
    killSignal: 'SIGINT',
    stdio: 'inherit',
  })

  process.on('SIGINT', () => {
    process.stdout.write('\nCleaning up 🧹...')
    exec('pnpm run services:stop')
  })
}

cleanDatabase()
