export function Footer() {
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
        </div>
      </div>
    </footer>
  )
}