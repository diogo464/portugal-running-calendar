import { z } from 'zod'

// Coordinate pair schema (longitude, latitude)
const CoordinateSchema = z.tuple([z.number(), z.number()])

// Array of coordinates forming a polygon ring
const PolygonRingSchema = z.array(CoordinateSchema)

// Polygon geometry with one or more rings
const PolygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(PolygonRingSchema)
})

// GeometryCollection containing polygon geometries
const GeometryCollectionSchema = z.object({
  type: z.literal('GeometryCollection'),
  geometries: z.array(PolygonGeometrySchema)
})

// Individual district schema
export const DistrictSchema = z.object({
  code: z.number(),
  name: z.string(),
  geo_shape: GeometryCollectionSchema
})

// Complete districts file schema (object with string keys mapping to districts)
export const DistrictsFileSchema = z.record(z.string(), DistrictSchema)

// TypeScript types inferred from schemas
export type Coordinate = z.infer<typeof CoordinateSchema>
export type PolygonRing = z.infer<typeof PolygonRingSchema>
export type PolygonGeometry = z.infer<typeof PolygonGeometrySchema>
export type GeometryCollection = z.infer<typeof GeometryCollectionSchema>
export type District = z.infer<typeof DistrictSchema>
export type DistrictsFile = z.infer<typeof DistrictsFileSchema>

// Utility functions for validation
export function validateDistrict(data: unknown): District {
  return DistrictSchema.parse(data)
}

export function validateDistrictsFile(data: unknown): DistrictsFile {
  return DistrictsFileSchema.parse(data)
}