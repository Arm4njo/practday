/**
 * NLP-модуль для анализа тональности отзывов и построения характеристик
 * Использует словарный метод анализа на русском языке
 */

// Словарь позитивных слов
const POSITIVE_WORDS = [
  'ответственный', 'ответственная', 'ответственно',
  'пунктуальный', 'пунктуальная', 'пунктуально', 'пунктуальность',
  'быстро', 'отлично', 'хорошо', 'прекрасно', 'замечательно',
  'профессионально', 'профессиональный', 'профессионализм',
  'инициативный', 'инициативная', 'инициатива', 'инициативность',
  'старательный', 'старательная', 'старательно', 'усердно', 'усердный',
  'грамотный', 'грамотная', 'грамотно',
  'компетентный', 'компетентная', 'компетентность',
  'трудолюбивый', 'трудолюбивая', 'трудолюбие',
  'дисциплинированный', 'дисциплинированная', 'дисциплина',
  'аккуратный', 'аккуратная', 'аккуратно', 'аккуратность',
  'коммуникабельный', 'коммуникабельная', 'коммуникабельность',
  'обучаемый', 'обучаемая', 'обучаемость', 'обучается',
  'качественно', 'качественный', 'качество',
  'внимательный', 'внимательная', 'внимательно', 'внимательность',
  'добросовестный', 'добросовестная', 'добросовестно',
  'надёжный', 'надёжная', 'надёжно',
  'высокий', 'высокая', 'высоко',
  'отличный', 'отличная', 'успешно', 'успешный',
  'рекомендую', 'рекомендуем', 'рекомендуется',
  'похвала', 'хвалю', 'молодец',
  'творческий', 'творческая', 'креативный', 'креативная',
  'самостоятельный', 'самостоятельная', 'самостоятельно',
  'активный', 'активная', 'активно',
  'эффективный', 'эффективная', 'эффективно',
  'талантливый', 'талантливая',
  'освоил', 'освоила', 'освоение',
  'справился', 'справилась',
  'выполнил', 'выполнила', 'выполнение',
  'демонстрировал', 'демонстрировала', 'продемонстрировал',
  'показал', 'показала', 'достиг', 'достигла',
  'соблюдал', 'соблюдала', 'соблюдение',
];

// Словарь негативных слов
const NEGATIVE_WORDS = [
  'безответственный', 'безответственная', 'безответственно',
  'опаздывает', 'опоздание', 'опаздывал', 'опаздывала',
  'прогул', 'прогулы', 'пропуск', 'пропуски',
  'плохо', 'плохой', 'плохая',
  'низкий', 'низкая', 'низко',
  'некачественно', 'некачественный',
  'невнимательный', 'невнимательная', 'невнимательно',
  'ленивый', 'ленивая', 'лень',
  'недисциплинированный', 'недисциплинированная',
  'небрежный', 'небрежная', 'небрежно',
  'не выполнил', 'не выполнила', 'невыполнение',
  'не справился', 'не справилась',
  'конфликтный', 'конфликтная', 'конфликт',
  'грубый', 'грубая', 'грубо',
  'нарушение', 'нарушения', 'нарушал', 'нарушала',
  'жалоба', 'жалобы',
  'слабый', 'слабая', 'слабо',
  'неудовлетворительно', 'неудовлетворительный',
  'отсутствие', 'отсутствовал', 'отсутствовала',
  'не рекомендую', 'замечание', 'замечания',
  'неаккуратный', 'неаккуратная', 'неаккуратно',
];

// Аспекты для классификации
const ASPECTS = {
  skills: {
    label_ru: 'Профессиональные навыки',
    label_kk: 'Кәсіби дағдылар',
    keywords: ['навык', 'навыки', 'умение', 'компетенц', 'освоил', 'освоила', 'обучился', 'обучилась', 'профессионал', 'квалификац', 'мастерство', 'техник', 'программирован', 'сварк', 'работ'],
  },
  discipline: {
    label_ru: 'Дисциплина',
    label_kk: 'Тәртіп',
    keywords: ['дисциплин', 'пунктуальн', 'вовремя', 'опоздан', 'прогул', 'посещ', 'присутств', 'график', 'режим', 'соблюда', 'порядок'],
  },
  initiative: {
    label_ru: 'Инициативность',
    label_kk: 'Бастамашылдық',
    keywords: ['инициатив', 'самостоятельн', 'предлож', 'творческ', 'креатив', 'актив', 'стремлен', 'интерес', 'энтузиазм', 'мотивац'],
  },
  communication: {
    label_ru: 'Коммуникабельность',
    label_kk: 'Коммуникабельділік',
    keywords: ['коммуник', 'общен', 'коллектив', 'команд', 'взаимодейств', 'контакт', 'отношен', 'сотруднич', 'вежлив', 'доброжелат'],
  },
  responsibility: {
    label_ru: 'Ответственность',
    label_kk: 'Жауапкершілік',
    keywords: ['ответствен', 'добросовестн', 'надёжн', 'обязательн', 'поручен', 'задан', 'выполн', 'срок', 'качеств'],
  },
};

/**
 * Анализ тональности текста отзыва
 */
function analyzeSentiment(text) {
  if (!text) return { score: 0, label: 'neutral', positive: 0, negative: 0, total: 0 };

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/[\s,.!?;:()\"]+/).filter(w => w.length > 2);

  let positiveCount = 0;
  let negativeCount = 0;
  const foundPositive = [];
  const foundNegative = [];

  // Проверяем позитивные слова
  for (const word of POSITIVE_WORDS) {
    if (lowerText.includes(word)) {
      positiveCount++;
      foundPositive.push(word);
    }
  }

  // Проверяем негативные слова
  for (const word of NEGATIVE_WORDS) {
    if (lowerText.includes(word)) {
      negativeCount++;
      foundNegative.push(word);
    }
  }

  const total = positiveCount + negativeCount;
  let score = 0;
  let label = 'neutral';

  if (total > 0) {
    score = ((positiveCount - negativeCount) / total) * 100;
    if (score > 20) label = 'positive';
    else if (score < -20) label = 'negative';
    else label = 'neutral';
  }

  return {
    score: Math.round(score),
    label,
    positive: positiveCount,
    negative: negativeCount,
    total,
    foundPositive: [...new Set(foundPositive)],
    foundNegative: [...new Set(foundNegative)],
    positivePercent: total > 0 ? Math.round((positiveCount / total) * 100) : 50,
  };
}

/**
 * Определение ключевых аспектов в отзыве
 */
function extractAspects(text) {
  if (!text) return [];

  const lowerText = text.toLowerCase();
  const result = [];

  for (const [key, aspect] of Object.entries(ASPECTS)) {
    let mentionCount = 0;
    const foundKeywords = [];
    for (const kw of aspect.keywords) {
      if (lowerText.includes(kw)) {
        mentionCount++;
        foundKeywords.push(kw);
      }
    }
    if (mentionCount > 0) {
      result.push({
        aspect: key,
        label_ru: aspect.label_ru,
        label_kk: aspect.label_kk,
        mentions: mentionCount,
        keywords: [...new Set(foundKeywords)],
      });
    }
  }

  return result.sort((a, b) => b.mentions - a.mentions);
}

/**
 * Анализ нескольких отзывов и генерация сводного отчёта
 */
function analyzeMultipleReviews(reviews) {
  if (!reviews || reviews.length === 0) {
    return { overall_score: 0, overall_label: 'neutral', positive_percent: 0, reviews_count: 0, aspects: [], summary: '' };
  }

  let totalPositive = 0;
  let totalNegative = 0;
  const allAspects = {};
  const analyses = [];

  for (const review of reviews) {
    const sentiment = analyzeSentiment(review.review_text || review);
    const aspects = extractAspects(review.review_text || review);
    analyses.push({ sentiment, aspects });

    totalPositive += sentiment.positive;
    totalNegative += sentiment.negative;

    for (const a of aspects) {
      if (!allAspects[a.aspect]) {
        allAspects[a.aspect] = { ...a, totalMentions: 0 };
      }
      allAspects[a.aspect].totalMentions += a.mentions;
    }
  }

  const total = totalPositive + totalNegative;
  const positivePercent = total > 0 ? Math.round((totalPositive / total) * 100) : 50;

  let overallLabel = 'neutral';
  if (positivePercent > 60) overallLabel = 'positive';
  else if (positivePercent < 40) overallLabel = 'negative';

  const sortedAspects = Object.values(allAspects).sort((a, b) => b.totalMentions - a.totalMentions);

  return {
    overall_score: positivePercent,
    overall_label: overallLabel,
    positive_percent: positivePercent,
    reviews_count: reviews.length,
    aspects: sortedAspects,
    analyses,
  };
}

/**
 * Генерация характеристики на основе данных
 */
function generateCharacteristic(data) {
  const { studentName, organization, discipline, startDate, endDate, attendanceData, diaryData, reviewsAnalysis } = data;

  const heShe = 'студент';
  let text = `Студент ${studentName} проходил(а) производственную практику в ${organization || 'организации'}`;

  if (discipline) {
    text += ` по дисциплине "${discipline}"`;
  }
  if (startDate && endDate) {
    text += ` в период с ${startDate} по ${endDate}`;
  }
  text += '.\n\n';

  // Блок посещаемости
  if (attendanceData) {
    const { totalDays, presentDays, attendancePercent } = attendanceData;
    if (attendancePercent >= 90) {
      text += `За время практики ${heShe} демонстрировал(а) высокий уровень посещаемости (${attendancePercent}%), `;
      text += `присутствовал(а) ${presentDays} из ${totalDays} дней. `;
    } else if (attendancePercent >= 70) {
      text += `Посещаемость практики составила ${attendancePercent}% (${presentDays} из ${totalDays} дней). `;
    } else {
      text += `Посещаемость практики была ниже ожидаемой — ${attendancePercent}% (${presentDays} из ${totalDays} дней). `;
    }
    text += '\n\n';
  }

  // Блок навыков из дневника
  if (diaryData && diaryData.skills && diaryData.skills.length > 0) {
    text += `В ходе практики были освоены следующие навыки: ${diaryData.skills.join(', ')}. `;
    if (diaryData.totalHours) {
      text += `Общее количество отработанных часов: ${diaryData.totalHours}. `;
    }
    text += '\n\n';
  }

  // Блок отзывов
  if (reviewsAnalysis && reviewsAnalysis.reviews_count > 0) {
    text += `По результатам оценки социальным партнёром: ${reviewsAnalysis.positive_percent}% позитивных отзывов. `;

    if (reviewsAnalysis.aspects && reviewsAnalysis.aspects.length > 0) {
      const topAspects = reviewsAnalysis.aspects.slice(0, 3).map(a => a.label_ru.toLowerCase());
      text += `Отмечены: ${topAspects.join(', ')}. `;
    }

    if (reviewsAnalysis.overall_label === 'positive') {
      text += 'Общая оценка от партнёра — положительная. ';
    } else if (reviewsAnalysis.overall_label === 'negative') {
      text += 'Имеются замечания от партнёра, требующие внимания. ';
    }
    text += '\n\n';
  }

  // Рекомендация
  const overallScore = reviewsAnalysis ? reviewsAnalysis.positive_percent : 50;
  if (overallScore >= 80) {
    text += 'Рекомендация: Студент успешно завершил(а) практику и рекомендуется к дальнейшему трудоустройству по специальности.';
  } else if (overallScore >= 60) {
    text += 'Рекомендация: Студент в целом справился(ась) с задачами практики. Рекомендуется продолжить развитие профессиональных навыков.';
  } else {
    text += 'Рекомендация: Студенту необходимо усилить работу над профессиональными компетенциями и дисциплиной.';
  }

  return text;
}

module.exports = {
  analyzeSentiment,
  extractAspects,
  analyzeMultipleReviews,
  generateCharacteristic,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  ASPECTS,
};
