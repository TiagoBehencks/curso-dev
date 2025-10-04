import { exec, type ExecException } from 'node:child_process'

function checkPostgres() {
  exec('docker exec postgres-dev pg_isready --host localhost', handleReturn)

  function handleReturn(error: ExecException | null, stdout: string) {
    if (stdout.search('accepting connections') === -1) {
      process.stdout.write('.')

      checkPostgres()
      return
    }

    console.log('\n🟢 Postgres is ready and accepting connections!\n')
  }
}

process.stdout.write('\n\n🔴 Waiting for Postgres to accept connections')
checkPostgres()
