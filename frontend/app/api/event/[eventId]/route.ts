import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod/v4'

// Simple event ID validation
const EventIdSchema = z.string().regex(/^\d+$/, 'Event ID must be numeric')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // Await params as it's now a Promise
    const resolvedParams = await params
    // Validate event ID
    const eventId = EventIdSchema.parse(resolvedParams.eventId)
    
    // Construct file path
    const filePath = join(process.cwd(), 'public', 'events', `${eventId}.json`)
    
    try {
      // Read the event file
      const fileContent = await readFile(filePath, 'utf-8')
      const eventData = JSON.parse(fileContent)
      
      // Set cache headers - 1 day cache as requested
      const response = NextResponse.json(eventData)
      
      // Cache for 1 day (86400 seconds) with stale-while-revalidate
      response.headers.set(
        'Cache-Control', 
        'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
      )
      
      // Add ETag for better caching
      const etag = `"${eventId}-${Buffer.from(fileContent).toString('base64').slice(0, 16)}"`
      response.headers.set('ETag', etag)
      
      // Check if client has cached version
      const ifNoneMatch = request.headers.get('if-none-match')
      if (ifNoneMatch === etag) {
        return new NextResponse(null, { status: 304 })
      }
      
      return response
      
    } catch (fileError: unknown) {
      // Event file not found
      if (fileError && typeof fileError === 'object' && 'code' in fileError && fileError.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        )
      }
      
      // Other file system errors
      console.error('Error reading event file:', fileError)
      return NextResponse.json(
        { error: 'Failed to read event data' },
        { status: 500 }
      )
    }
    
  } catch {
    // Invalid event ID format
    return NextResponse.json(
      { error: 'Invalid event ID format' },
      { status: 400 }
    )
  }
}