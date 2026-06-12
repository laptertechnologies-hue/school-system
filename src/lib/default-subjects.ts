export const defaultPrimarySubjects = [
  { name: "Mathematics", code: "MTC" },
  { name: "English", code: "ENG" },
  { name: "Science", code: "SCI" },
  { name: "Social Studies", code: "SST" },
];

export const defaultNurserySubjects = [
  { name: "Numbers", code: "NUM" },
  { name: "Reading", code: "RDG" },
  { name: "Writing", code: "WRT" },
  { name: "Drawing", code: "DRW" },
];

export const defaultSecondarySubjects = [
  { name: "Mathematics", code: "MTC" },
  { name: "English Language", code: "ENG" },
  { name: "Physics", code: "PHY" },
  { name: "Chemistry", code: "CHE" },
  { name: "Biology", code: "BIO" },
  { name: "Geography", code: "GEO" },
  { name: "History", code: "HIS" },
  { name: "Entrepreneurship", code: "ENT" },
  { name: "Christian Religious Education", code: "CRE" },
  { name: "Agriculture", code: "AGR" },
];

export async function populateDefaultSubjects(db: any, schoolId: string, classId: string, level: string, className: string) {
  let subjectsToCreate: { name: string; code: string }[] = [];

  if (level === "PRIMARY") {
    // If it's a nursery class, use nursery subjects
    if (className.toLowerCase().includes("baby") || className.toLowerCase().includes("middle") || className.toLowerCase().includes("top") || className.toLowerCase().includes("nursery")) {
      subjectsToCreate = defaultNurserySubjects;
    } else {
      subjectsToCreate = defaultPrimarySubjects;
    }
  } else if (level === "SECONDARY") {
    subjectsToCreate = defaultSecondarySubjects;
  }

  for (const sub of subjectsToCreate) {
    // Check if it already exists to avoid duplicates
    const existing = await db.subject.findFirst({
      where: { schoolId, classId, name: sub.name }
    });

    if (!existing) {
      await db.subject.create({
        data: {
          schoolId,
          classId,
          name: sub.name,
          code: sub.code
        }
      });
    }
  }
}
