import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateRescueTime(distanceInMeters: number): number {
    // Assume an average walking speed of 5 km/h or 83.33 meters per minute
    const walkingSpeedMeterPerMinute = 83.33;
    
    // Add some buffer time for potential obstacles or difficulties
    const bufferTimeMinutes = 10;
    
    const estimatedTimeMinutes = (distanceInMeters / walkingSpeedMeterPerMinute) + bufferTimeMinutes;
    
    return Math.round(estimatedTimeMinutes);
}
