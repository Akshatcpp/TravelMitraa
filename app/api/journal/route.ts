// File: app/api/journal/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

/**
 * @route   GET /api/journel
 * @desc    Get all public journal entries
 * @access  Public
 */
export async function GET() {
  try {
    const journals = await prisma.journel.findMany({
      // Order by most recent first
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(journals, { status: 200 });

  } catch (error) {
    console.error("Error fetching journals:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching journal entries." },
      { status: 500 }
    );
  }
}

/**
 * @route   POST /api/journel
 * @desc    Create a new journal entry
 * @access  Public
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    // --- Basic Validation ---
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { message: "Journal text is required and cannot be empty." },
        { status: 400 } // Bad Request
      );
    }

    const newJournalEntry = await prisma.journel.create({
      data: {
        text: text.trim(),
      },
    });

    return NextResponse.json(newJournalEntry, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating journal entry:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the journal entry." },
      { status: 500 }
    );
  }
}