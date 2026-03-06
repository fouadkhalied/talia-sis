import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlan, Holiday, Course, TimetableEvent, Language } from "../types";

const getApiKey = () => {
  // Check both VITE_ prefix and process.env (for Vite define fallback)
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY || (process as any).env?.API_KEY;
};

const apiKey = getApiKey();
if (!apiKey) {
  console.warn("Gemini API Key is not set. AI features will be disabled.");
}

const ai = apiKey ? new GoogleGenAI(apiKey) : null;


export const generateSmartTimetable = async (
  startDate: string,
  endDate: string,
  holidays: Holiday[],
  courses: Course[],
  language: 'ar' | 'en'
): Promise<TimetableEvent[] | null> => {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Generate a smart academic timetable from ${startDate} to ${endDate}.
    Holidays: ${JSON.stringify(holidays)}.
    Courses to include: ${JSON.stringify(courses)}.
    The output must be in ${language === 'ar' ? 'Arabic' : 'English'}.
    Map out the pacing of all assessments and lessons to ensure the curriculum is finished on time.
    Return a list of events with id, title, date (YYYY-MM-DD), type (Lesson, Assessment, Review), and subjectId.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              type: { type: Type.STRING },
              subjectId: { type: Type.STRING }
            },
            required: ["id", "title", "date", "type", "subjectId"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as TimetableEvent[];
    }
    return null;
  } catch (error) {
    console.error("Error generating smart timetable:", error);
    return null;
  }
};

export const analyzeHolidayImpact = async (
  holiday: Holiday,
  impactedEvents: TimetableEvent[],
  language: 'ar' | 'en'
): Promise<{ suggestion: string; shiftedEvents: TimetableEvent[] } | null> => {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Analyze the impact of the holiday "${holiday.nameEn}" on ${holiday.date}.
    The following events are impacted: ${JSON.stringify(impactedEvents)}.
    The output must be in ${language === 'ar' ? 'Arabic' : 'English'}.
    Suggest how to shift the content without losing a week of learning.
    Return a JSON object with a "suggestion" string and a "shiftedEvents" array of TimetableEvent objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            shiftedEvents: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  date: { type: Type.STRING },
                  type: { type: Type.STRING },
                  subjectId: { type: Type.STRING },
                  isShifted: { type: Type.BOOLEAN },
                  originalDate: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Error analyzing holiday impact:", error);
    return null;
  }
};

export const predictResourceDemand = async (
  courses: Course[],
  language: 'ar' | 'en'
): Promise<{ courseId: string; predictedEnrollment: number; demandLevel: 'High' | 'Medium' | 'Low'; reason: string }[] | null> => {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Analyze the following courses and predict enrollment and resource demand based on typical school patterns.
    Courses: ${JSON.stringify(courses)}.
    The output must be in ${language === 'ar' ? 'Arabic' : 'English'}.
    Return a list of predictions with courseId, predictedEnrollment, demandLevel, and reason.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              courseId: { type: Type.STRING },
              predictedEnrollment: { type: Type.NUMBER },
              demandLevel: { type: Type.STRING },
              reason: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Error predicting resource demand:", error);
    return null;
  }
};
export const generateConflictFreeSchedule = async (
  teachers: any[],
  rooms: any[],
  courses: Course[],
  preferences: any[],
  language: 'ar' | 'en'
): Promise<any | null> => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Act as an expert school scheduler. Build a master conflict-free timetable.
    Teachers: ${JSON.stringify(teachers)}
    Rooms: ${JSON.stringify(rooms)}
    Courses: ${JSON.stringify(courses)}
    Student Preferences: ${JSON.stringify(preferences)}
    Language: ${language === 'ar' ? 'Arabic' : 'English'}
    Ensure no teacher or room is double-booked. Maximize student preference fulfillment.
    Return a JSON object representing the master schedule.
  `;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Error generating schedule:", error);
    return null;
  }
};

export const simulateHolidayImpact = async (
  holidays: Holiday[],
  startDate: string,
  endDate: string,
  curriculumSummary: string,
  language: 'ar' | 'en'
): Promise<any | null> => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze the impact of these holidays on the academic year (${startDate} to ${endDate}).
    Holidays: ${JSON.stringify(holidays)}
    Curriculum: ${curriculumSummary}
    Language: ${language === 'ar' ? 'Arabic' : 'English'}
    Predict total lost instructional hours. Suggest makeup strategies (weekend sessions, digital asynchronous days).
    Return a JSON object with: { lostHours: number, impactLevel: string, suggestions: string[] }.
  `;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Error simulating holiday impact:", error);
    return null;
  }
};

export const generateTermPacingGuide = async (
  startDate: string,
  endDate: string,
  syllabus: string,
  language: 'ar' | 'en'
): Promise<any | null> => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Create a weekly pacing guide for this syllabus from ${startDate} to ${endDate}.
    Syllabus: ${syllabus}
    Language: ${language === 'ar' ? 'Arabic' : 'English'}
    Ensure all topics are covered before the end date.
    Return a JSON array of weeks: [{ weekNumber: number, topics: string[], goal: string }].
  `;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Error generating pacing guide:", error);
    return null;
  }
};

export const predictIntakeAndSections = async (
  historicalData: any,
  currentInquiries: any,
  language: 'ar' | 'en'
): Promise<any | null> => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Predict next year's intake and required section counts.
    Historical Data: ${JSON.stringify(historicalData)}
    Current Inquiries: ${JSON.stringify(currentInquiries)}
    Language: ${language === 'ar' ? 'Arabic' : 'English'}
    Return a JSON object with: { predictedEnrollment: number, requiredSections: number, confidence: string, reasoning: string }.
  `;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Error predicting intake:", error);
    return null;
  }
};

export const fetchEgyptianHolidays = async (year: string, language: Language): Promise<Holiday[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `List all official national holidays in Egypt for the year ${year}. Return the data in JSON format as an array of Holiday objects with id, nameEn, nameAr, date (YYYY-MM-DD), and type: "National". Language preference: ${language}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            nameEn: { type: Type.STRING },
            nameAr: { type: Type.STRING },
            date: { type: Type.STRING },
            type: { type: Type.STRING }
          },
          required: ["id", "nameEn", "nameAr", "date", "type"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse holidays:", e);
    return [];
  }
};

export const analyzePromotionEligibility = async (
  students: any[],
  requirements: any,
  language: 'ar' | 'en'
): Promise<any | null> => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze student promotion eligibility for the next academic year.
    Students: ${JSON.stringify(students)}
    Requirements: ${JSON.stringify(requirements)}
    Language: ${language === 'ar' ? 'Arabic' : 'English'}
    Check for missing grades or unmet requirements.
    Return a JSON object with: { eligibleCount: number, atRiskCount: number, issues: [{ studentId: string, reason: string }] }.
  `;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Error analyzing promotion:", error);
    return null;
  }
};

export const generateLessonPlan = async (
  topic: string,
  grade: string,
  subject: string,
  language: 'ar' | 'en'
): Promise<LessonPlan | null> => {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Create a detailed lesson plan for a ${grade} class on the subject of ${subject}.
    The specific topic is: "${topic}".
    The output must be in ${language === 'ar' ? 'Arabic' : 'English'}.
    Include 3 learning objectives, a list of materials, a step-by-step outline with timing, and a short 3-question quiz at the end.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            gradeLevel: { type: Type.STRING },
            subject: { type: Type.STRING },
            objectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            materials: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            outline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  duration: { type: Type.STRING },
                  activity: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as LessonPlan;
    }
    return null;
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    return null;
  }
};