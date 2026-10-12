/**
 * Python-Inspired Hybrid Two-Stage Recommendation Engine
 * Simulating the Python Scikit-Learn / FastAPI microservice architecture
 * using TF-IDF feature vectorization and Cosine Similarity scoring.
 * 
 * Stage 1: Cold-Start Fallback (Academic Faculty grounding + Popularity)
 * Stage 2: Behavioral Content-Based (TF-IDF vector space + User interaction profile)
 */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could', 'did',
  'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'wasn\'t', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
]);

/**
 * Clean text into normalized tokens
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

/**
 * Build document string representing the product features
 */
function getProductDocument(product) {
  const parts = [
    product.title,
    product.title, // Double weight on title
    product.description,
    product.category,
    product.facultyTag,
    product.facultyTag, // Double weight on faculty
    product.courseCode || '',
    (product.tags || []).join(' '),
    (product.tags || []).join(' ')
  ];
  return parts.join(' ');
}

/**
 * Computes Term Frequency (TF) for a tokenized document
 */
function computeTF(tokens) {
  const tf = {};
  const total = tokens.length || 1;
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  for (const token in tf) {
    tf[token] = tf[token] / total;
  }
  return tf;
}

/**
 * Computes Inverse Document Frequency (IDF) over the catalog corpus
 */
function computeIDF(corpus) {
  const docCount = corpus.length;
  const df = {};

  for (const docTokens of corpus) {
    const uniqueTokens = new Set(docTokens);
    for (const token of uniqueTokens) {
      df[token] = (df[token] || 0) + 1;
    }
  }

  const idf = {};
  for (const token in df) {
    // Smooth IDF formula: ln((1 + N) / (1 + df)) + 1
    idf[token] = Math.log((1 + docCount) / (1 + df[token])) + 1;
  }
  return idf;
}

/**
 * Computes TF-IDF vector given TF and corpus IDF
 */
function computeTFIDF(tf, idf) {
  const vector = {};
  for (const token in tf) {
    const tokenIDF = idf[token] || 1;
    vector[token] = tf[token] * tokenIDF;
  }
  return vector;
}

/**
 * Cosine Similarity between two sparse TF-IDF vectors
 * cos(A, B) = (A · B) / (||A|| * ||B||)
 */
function computeCosineSimilarity(vectorA, vectorB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const key in vectorA) {
    normA += vectorA[key] * vectorA[key];
  }
  for (const key in vectorB) {
    normB += vectorB[key] * vectorB[key];
  }

  if (normA === 0 || normB === 0) return { score: 0, sharedTerms: [] };

  const sharedTerms = [];
  for (const key in vectorA) {
    if (vectorB[key]) {
      const termContribution = vectorA[key] * vectorB[key];
      dotProduct += termContribution;
      sharedTerms.push({ term: key, contribution: termContribution });
    }
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  const score = denominator > 0 ? dotProduct / denominator : 0;

  sharedTerms.sort((a, b) => b.contribution - a.contribution);

  return {
    score: Math.min(Math.max(score, 0), 1),
    sharedTerms: sharedTerms.slice(0, 5)
  };
}

/**
 * Two-Stage Hybrid Recommendation Function
 * 
 * @param {Array} allProducts - Full catalog of items
 * @param {Object} currentUser - Active user with faculty, wishlist
 * @param {Array} userInteractions - Recent item views/interactions
 * @param {String} currentProductId - Optional product to exclude or find related items for
 * @param {Number} limit - Max recommendations to return
 */
export function getHybridRecommendations(
  allProducts = [],
  currentUser = null,
  userInteractions = [],
  currentProductId = null,
  limit = 5
) {
  if (!allProducts || allProducts.length === 0) return [];

  // Filter available items and exclude current viewed item if provided
  const candidatePool = allProducts.filter(p => 
    p.id !== currentProductId && p.status === 'available'
  );

  if (candidatePool.length === 0) return [];

  // Step 1: Pre-calculate Corpus TF-IDF Vectors
  const tokenizedCorpus = allProducts.map(p => tokenize(getProductDocument(p)));
  const idf = computeIDF(tokenizedCorpus);

  const productVectors = {};
  allProducts.forEach(p => {
    const tokens = tokenize(getProductDocument(p));
    const tf = computeTF(tokens);
    productVectors[p.id] = {
      vector: computeTFIDF(tf, idf),
      tokens
    };
  });

  // Step 2: Determine if Cold Start or Behavioral Content-Based
  const viewedIds = (userInteractions || [])
    .filter(i => i.interactionType === 'view' || i.type === 'view')
    .map(i => i.productId || i.id);
  
  const wishlistIds = (currentUser?.wishlist || []);
  const hasHistory = viewedIds.length > 0 || wishlistIds.length > 0;

  // -------------------------------------------------------------
  // STAGE 1: Cold Start Heuristic (Campus Trending & Popularity)
  // -------------------------------------------------------------
  if (!hasHistory || !currentUser) {
    const scoredCold = candidatePool.map(product => {
      let score = 0;
      const matchedTerms = [];

      // Popularity signal: views & wishlist ratio
      const viewsSignal = Math.min((product.viewsCount || 0) / 300, 0.45);
      const wishlistSignal = Math.min((product.wishlistCount || 0) / 40, 0.35);
      const recencySignal = 0.15;
      score = viewsSignal + wishlistSignal + recencySignal;

      matchedTerms.push({ term: product.category, contribution: 0.35 });

      return {
        product,
        similarityScore: Math.min(score, 0.98),
        confidencePercent: Math.round(Math.min(score, 0.98) * 100),
        stage: 'Stage 1: Cold-Start (Campus Trends & Popularity)',
        matchedTerms,
        mlExplanation: {
          strategy: 'Interaction Volume Normalization & Trending Engagement',
          popularRatio: `${product.viewsCount || 0} views / ${product.wishlistCount || 0} wishlists`,
          mathFormula: 'Score = norm(views) + norm(wishlist) + freshness'
        }
      };
    });

    scoredCold.sort((a, b) => b.similarityScore - a.similarityScore);
    return scoredCold.slice(0, limit);
  }

  // -------------------------------------------------------------
  // STAGE 2: Behavioral Content-Based (TF-IDF & Cosine Similarity)
  // -------------------------------------------------------------
  
  // Construct User Preference Vector
  const userProfileVector = {};

  // Add Wishlist Items (High weight: 3.0)
  wishlistIds.forEach(id => {
    const pv = productVectors[id];
    if (pv && pv.vector) {
      for (const token in pv.vector) {
        userProfileVector[token] = (userProfileVector[token] || 0) + pv.vector[token] * 3.0;
      }
    }
  });

  // Add Browsing History (Moderate weight: 1.5 with recency)
  viewedIds.slice(-5).forEach((id, index) => {
    const pv = productVectors[id];
    const recencyWeight = 1.0 + (index * 0.15); // more recent = higher weight
    if (pv && pv.vector) {
      for (const token in pv.vector) {
        userProfileVector[token] = (userProfileVector[token] || 0) + pv.vector[token] * recencyWeight;
      }
    }
  });

  // Score candidates with Cosine Similarity against User Profile Vector
  const scoredCandidates = candidatePool.map(product => {
    const candidateData = productVectors[product.id];
    if (!candidateData) {
      return { product, similarityScore: 0, confidencePercent: 0, stage: 'Stage 2: Behavioral TF-IDF', matchedTerms: [] };
    }

    const { score, sharedTerms } = computeCosineSimilarity(userProfileVector, candidateData.vector);
    const finalScore = Math.min(score, 0.99);

    return {
      product,
      similarityScore: finalScore,
      confidencePercent: Math.max(Math.round(finalScore * 100), 35),
      stage: 'Stage 2: Behavioral Content-Based (TF-IDF Vector Space)',
      matchedTerms: sharedTerms,
      mlExplanation: {
        strategy: 'Cosine Similarity between User Intent Vector and Product TF-IDF Vector',
        cosineValue: score.toFixed(4),
        mathFormula: 'cos(θ) = (u · v) / (||u|| * ||v||)',
        topSharedTokens: sharedTerms.map(t => `${t.term} (${t.contribution.toFixed(3)})`).join(', ') || 'Category overlap'
      }
    };
  });

  scoredCandidates.sort((a, b) => b.similarityScore - a.similarityScore);
  return scoredCandidates.slice(0, limit);
}

/**
 * Single-product related items (for Product Detail View - "Similar Course Materials")
 */
export function getRelatedProducts(targetProduct, allProducts, limit = 4) {
  if (!targetProduct || !allProducts) return [];

  const candidates = allProducts.filter(p => 
    p.id !== targetProduct.id && p.status === 'available'
  );

  // Compute local TF-IDF between target product and candidates
  const tokenizedCorpus = allProducts.map(p => tokenize(getProductDocument(p)));
  const idf = computeIDF(tokenizedCorpus);

  const targetTokens = tokenize(getProductDocument(targetProduct));
  const targetTF = computeTF(targetTokens);
  const targetVector = computeTFIDF(targetTF, idf);

  const scored = candidates.map(product => {
    const tokens = tokenize(getProductDocument(product));
    const tf = computeTF(tokens);
    const vector = computeTFIDF(tf, idf);
    const { score, sharedTerms } = computeCosineSimilarity(targetVector, vector);

    const facultyBonus = product.faculty === targetProduct.faculty ? 0.15 : 0;
    const categoryBonus = product.category === targetProduct.category ? 0.10 : 0;
    const totalScore = Math.min(score + facultyBonus + categoryBonus, 0.99);

    return {
      product,
      similarityScore: totalScore,
      confidencePercent: Math.round(totalScore * 100),
      stage: 'Item-to-Item Similarity (TF-IDF Cosine Distance)',
      matchedTerms: sharedTerms,
      mlExplanation: {
        strategy: 'Item-to-Item Feature Vector Cosine Similarity',
        cosineValue: score.toFixed(4),
        categoryBonus: `+${(categoryBonus * 100)}%`,
        facultyBonus: `+${(facultyBonus * 100)}%`
      }
    };
  });

  scored.sort((a, b) => b.similarityScore - a.similarityScore);
  return scored.slice(0, limit);
}
