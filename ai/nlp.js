const { GoogleGenerativeAI } = require("@google/generative-ai");

// Инициализация Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Анализ одного отзыва через Gemini
 */
async function analyzeSingleReview(text) {
    const prompt = `
        Проанализируй отзыв социального партнера о студенте:
        "${text}"
        
        Верни ответ строго в формате JSON:
        {
          "score": число от 0 до 100,
          "label": "positive" | "negative" | "neutral",
          "aspects": [
            {"aspect": "skills", "label_ru": "Профессиональные навыки", "mentions": 1}
          ]
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonText = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (err) {
        return { score: 50, label: 'neutral', aspects: [] };
    }
}

/**
 * Анализ тональности и извлечение аспектов через Gemini AI
 */
async function analyzeMultipleReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        return { overall_score: 0, overall_label: 'neutral', positive_percent: 0, reviews_count: 0, aspects: [], summary: '' };
    }

    const reviewsText = reviews.map(r => r.review_text || r).join('\n---\n');
    
    const prompt = `
        Проанализируй следующие отзывы социальных партнеров о студенте на практике:
        ${reviewsText}
        
        Верни ответ строго в формате JSON:
        {
          "overall_score": число от 0 до 100 (процент позитивности),
          "overall_label": "positive" | "negative" | "neutral",
          "aspects": [
            {"aspect": "skills", "label_ru": "Профессиональные навыки", "mentions": число},
            {"aspect": "discipline", "label_ru": "Дисциплина", "mentions": число},
            {"aspect": "initiative", "label_ru": "Инициативность", "mentions": число},
            {"aspect": "communication", "label_ru": "Коммуникабельность", "mentions": число}
          ],
          "summary": "краткое резюме отзывов на 2-3 предложения"
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Очистка от markdown блоков если есть
        text = text.replace(/```json|```/g, '').trim();
        
        const data = JSON.parse(text);
        return {
            ...data,
            positive_percent: data.overall_score,
            reviews_count: reviews.length
        };
    } catch (err) {
        console.error('Gemini Analysis Error:', err);
        // Фоллбек на старую логику или пустой объект
        return { overall_score: 50, overall_label: 'neutral', positive_percent: 50, reviews_count: reviews.length, aspects: [], summary: 'Ошибка анализа ИИ' };
    }
}

/**
 * Генерация характеристики через Gemini AI
 */
async function generateCharacteristic(data) {
    const { studentName, organization, discipline, startDate, endDate, attendanceData, diaryData, reviewsAnalysis } = data;

    const prompt = `
        Сгенерируй официальную характеристику для студента на основе следующих данных:
        Студент: ${studentName}
        Организация: ${organization}
        Дисциплина: ${discipline}
        Период: с ${startDate} по ${endDate}
        
        Посещаемость: ${attendanceData.presentDays} из ${attendanceData.totalDays} дней (${attendanceData.attendancePercent}%)
        Навыки из дневника: ${diaryData.skills.join(', ')}
        Отработано часов: ${diaryData.totalHours}
        
        Анализ отзывов партнера: ${reviewsAnalysis.summary || 'Нет отзывов'}
        Процент позитивности: ${reviewsAnalysis.positive_percent}%
        
        Характеристика должна быть написана в официально-деловом стиле, на русском языке. 
        Включи оценку профессиональных навыков, личностных качеств и дисциплины.
        В конце дай рекомендацию.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (err) {
        console.error('Gemini Generation Error:', err);
        return `Характеристика для ${studentName}. (Ошибка генерации ИИ)`;
    }
}

module.exports = {
    analyzeSingleReview,
    analyzeMultipleReviews,
    generateCharacteristic
};
