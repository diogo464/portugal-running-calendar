import { z } from 'zod/v4'
import { GeoJsonObject } from 'geojson'

// Coordinate pair schema (longitude, latitude)
const Coordinate = z.tuple([z.number(), z.number()])

// GeometryCollection containing polygon geometries
const GeometryCollection = z.object({
  type: z.string(),
  geometries: z.any(),
})

// Individual district schema
export const District = z.object({
  code: z.number(),
  name: z.string(),
  geo_shape: z.custom<GeoJsonObject>(), // Cast to GeoJsonObject
})

// Complete districts file schema (object with string keys mapping to districts)
export const DistrictsFile = z.record(z.string(), District)

// TypeScript types inferred from schemas
export type Coordinate = z.infer<typeof Coordinate>
export type GeometryCollection = z.infer<typeof GeometryCollection>
export type District = z.infer<typeof District>
export type DistrictsFile = z.infer<typeof DistrictsFile>

// Utility functions for validation
export function validateDistrict(data: unknown): District {
  return District.parse(data)
}

export function validateDistrictsFile(data: unknown): DistrictsFile {
  return DistrictsFile.parse(data)
}