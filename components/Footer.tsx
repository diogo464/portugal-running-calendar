const buildTimestamp = process.env.NEXT_PUBLIC_BUILD_TIMESTAMP

function formatBuildTimestamp(value?: string) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Lisbon',
  }).format(date)
}

export function Footer() {
  const formattedBuildTimestamp = formatBuildTimestamp(buildTimestamp)

  return (
    <footer className="border-t bg-background py-6 mt-8">
      <div className="container mx-auto px-4">
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Dados obtidos de{' '}
            <a 
              href="https://portugalrunning.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              https://portugalrunning.com
            </a>
          </p>
          <p>
            Contacto:{' '}
            <a 
              href="mailto:inbox@portugalruncalendar.com"
              className="text-foreground hover:underline"
            >
              inbox@portugalruncalendar.com
            </a>
          </p>
          {formattedBuildTimestamp && <p>Site gerado em {formattedBuildTimestamp}</p>}
        </div>
      </div>
    </footer>
  )
}
