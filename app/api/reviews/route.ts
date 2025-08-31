import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient'; // Make sure this path points to your Prisma client instance

/**
 * Handles GET requests to fetch all images from the database.
 * @returns A NextResponse object with the list of images or an error message.
 */
export async function GET() {
  try {
    // Fetch all image records from the database using Prisma.
    // They are ordered by the 'createdAt' field in descending order (newest first).
    const reviews = await prisma.review.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // If the query is successful, return the array of images with a 200 OK status.
    return NextResponse.json(reviews, { status: 200 });

  } catch (error) {
    // If any error occurs during the database operation, log it to the server console for debugging.
    console.error("Failed to fetch images:", error);

    // Return a JSON response with a generic error message and a 500 Internal Server Error status.
    return NextResponse.json(
      { error: "Unable to fetch images. Please try again later." },
      { status: 500 }
    );
  }
}
