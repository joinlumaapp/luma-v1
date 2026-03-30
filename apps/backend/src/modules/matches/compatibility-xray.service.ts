import { Injectable } from "@nestjs/common";

const XRAY_CATEGORIES = [
  { name: "values", nameTr: "Değerler" },
  { name: "interests", nameTr: "İlgi Alanları" },
  { name: "lifestyle", nameTr: "Yaşam Tarzı" },
  { name: "communication", nameTr: "İletişim" },
  { name: "future_plans", nameTr: "Gelecek Planları" },
];

@Injectable()
export class CompatibilityXrayService {
  /**
   * Get a detailed compatibility X-Ray breakdown between two users.
   * Compares per-category scores and highlights strongest dimensions.
   */
  async getXray(
    userId: string,
    targetUserId: string,
  ): Promise<{
    userId: string;
    targetUserId: string;
    overallScore: number;
    categories: {
      name: string;
      nameTr: string;
      score: number;
      maxScore: number;
      highlights: string[];
    }[];
    generatedAt: string;
  }> {
    // TODO: Fetch question answers for both users from DB
    // const userAnswers = await this.prisma.questionAnswer.findMany({
    //   where: { userId },
    // });
    // const targetAnswers = await this.prisma.questionAnswer.findMany({
    //   where: { userId: targetUserId },
    // });

    // TODO: Calculate per-category scores based on answer overlap
    const categories = XRAY_CATEGORIES.map((cat) => ({
      name: cat.name,
      nameTr: cat.nameTr,
      score: Math.floor(Math.random() * 40) + 60, // TODO: Real calculation
      maxScore: 100,
      highlights: [] as string[],
    }));

    const overallScore = Math.round(
      categories.reduce((s, c) => s + c.score, 0) / categories.length,
    );

    return {
      userId,
      targetUserId,
      overallScore,
      categories,
      generatedAt: new Date().toISOString(),
    };
  }
}
