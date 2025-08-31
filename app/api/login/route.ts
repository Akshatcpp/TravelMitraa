import { NextResponse } from "next/server";
import prisma from "@/lib/prismaClient"; // Make sure this path is correct

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { number } = body;

    // --- Input Validation ---
    if (!number) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }
    if (typeof number !== 'string' || number.length < 10) {
        return NextResponse.json(
            { error: "Invalid phone number format." },
            { status: 400 }
        );
    }


    // --- Database Logic ---
    let user = await prisma.user.findUnique({
      where: {
        number: number,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          number: number,
        },
      });
    }

    return NextResponse.json(user, { status: 200 });

  } catch (error) {
    // --- Crucial Error Logging ---
    // This will print the detailed error to your Next.js server terminal
    console.error("--- LOGIN API ERROR ---", error); 

    return NextResponse.json(
      { error: "An internal server error occurred. Check the server logs for details." },
      { status: 500 }
    );
  }
}
