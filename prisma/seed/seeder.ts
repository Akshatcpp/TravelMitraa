import { PrismaClient } from '@prisma/client';

// Create Prisma client with explicit direct URL for seeding operations
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

// A collection of sample review texts
const sampleReviews = [
  "An absolutely unforgettable experience! The views were breathtaking.",
  "A solid place to visit, though it can get a bit crowded on weekends.",
  "Truly a hidden gem. I was amazed by the history and the intricate details.",
  "It was a decent visit. Worth checking off the list if you're in the area.",
  "Five stars! The entire place is stunning. Every corner offers a new, beautiful sight.",
  "My family and I had a wonderful time. It's very peaceful and well-maintained.",
  "Unfortunately, it didn't live up to the hype for me. Felt a bit underwhelming.",
  "A must-see for any history buff! The amount of preserved history here is incredible.",
  "The perfect location for photography. The lighting is fantastic.",
  "A truly spiritual and moving place. I left feeling calm and inspired."
];

// --- NEW: A collection of sample journal entries ---
const sampleJournalEntries = [
    "Woke up early to catch the sunrise over the hills. The colors were absolutely magical. A perfect start to the day.",
    "Spent the afternoon exploring the local market. The smell of spices and the sound of vendors was a feast for the senses.",
    "Found a quiet little cafe and spent a few hours just reading and watching the world go by. Sometimes the simple moments are the best.",
    "Tried a local delicacy today. It was... interesting! Not sure I'd have it again, but glad I tried it.",
    "Today was a long travel day. Feeling a bit tired but excited for the new destination tomorrow.",
    "Met some fellow travelers and shared stories. It's amazing how a shared journey can connect people from all over the world.",
    "A day of reflection. This trip has taught me so much about myself and what I truly value.",
    "Visited a magnificent old temple. The sense of peace and history within its walls was profound."
];


async function main() {
  console.log('Starting the seed process...');

  // 1. Clean the database to ensure a fresh state
  console.log('Deleting existing data...');
  // Delete in an order that respects potential relations
  await prisma.image.deleteMany();
  await prisma.review.deleteMany();
  await prisma.journel.deleteMany(); // --- UPDATED: Added Journel table to cleanup ---
  await prisma.user.deleteMany();
  console.log('Existing data cleared.');

  // 2. Create sample users
  console.log('Creating users...');
  await prisma.user.createMany({
    data: [
      { number: '1000000001' },
      { number: '1000000002' },
      { number: '1000000003' },
    ],
  });
  console.log('Successfully created 3 users.');

  // 3. Create UNCONNECTED reviews
  console.log('Creating reviews (not linked to users)...');
  const reviewData = sampleReviews.map(reviewText => ({ text: reviewText }));
  await prisma.review.createMany({
    data: reviewData,
  });
  console.log(`Successfully created ${reviewData.length} reviews.`);

  // 4. Create UNCONNECTED images
  console.log('Creating images (not linked to users)...');
  const imageData = Array.from({ length: 15 }).map((_, i) => ({
    url: `https://picsum.photos/seed/${Math.random()}/1200/800`,
  }));
  await prisma.image.createMany({
    data: imageData,
  });
  console.log(`Successfully created ${imageData.length} images.`);
  
  // --- 5. NEW: Create sample journal entries ---
  console.log('Creating journal entries...');
  const journalData = sampleJournalEntries.map(entryText => ({ text: entryText }));
  await prisma.journel.createMany({
    data: journalData,
  });
  console.log(`Successfully created ${journalData.length} journal entries.`);


  console.log('Seeding finished successfully! ✨');
}

main()
  .catch((e) => {
    console.error('An error occurred during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });