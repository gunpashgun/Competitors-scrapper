/**
 * Analysis prompt for OpenRouter (Claude Vision)
 */
export const ANALYSIS_PROMPT = `Analyze this advertising creative in extreme detail and return a JSON object with the following structure:

{
  "headline": "Main headline text (if present)",
  "offer": "Offer/discount/benefit mentioned",
  "cta": "Call-to-action text",
  "bodyText": "Main body text content",
  "brandName": "Brand name mentioned",
  
  "logo": {
    "present": true/false,
    "position": "top-left/top-right/center/etc",
    "size": "small/medium/large"
  },
  
  "mainObject": "Description of the main subject (person, product, etc)",
  
  "secondaryObjects": ["array", "of", "secondary", "elements"],
  
  "layout": {
    "headlinePosition": "top/middle/bottom",
    "ctaPosition": "top/middle/bottom",
    "logoPosition": "top-left/top-right/etc",
    "textAlignment": "left/center/right",
    "visualHierarchy": "description of how elements are arranged"
  },
  
  "colors": ["#HEX1", "#HEX2", "#HEX3"],
  "dominantColor": "#HEX",
  
  "textBlocks": [
    {"text": "...", "position": "...", "size": "large/medium/small"}
  ],
  
  "backgroundType": "solid/gradient/photo/complex",
  "backgroundDescription": "detailed description",
  
  "borders": true/false,
  "shadows": true/false,
  "gradients": true/false,
  
  "style": "realistic/illustration/3d/collage/minimal/modern",
  "format": "square/vertical/horizontal",
  "aspectRatio": "1:1/9:16/16:9/etc",
  
  "visualFocus": "what draws the eye first",
  
  "people": {
    "present": true/false,
    "count": number,
    "type": "face/full-body/silhouette/hands",
    "age": "child/teen/adult/senior",
    "gender": "male/female/diverse",
    "emotion": "happy/excited/serious/thinking/etc",
    "action": "what they're doing",
    "clothing": "description of clothes/style"
  },
  
  "imageGenerationPrompts": {
    "character": "Detailed Midjourney prompt for generating similar character/person",
    "background": "Detailed Flux prompt for generating similar background"
  },
  
  "designPrinciples": {
    "colorContrast": "high/medium/low",
    "whitespace": "abundant/balanced/minimal",
    "typography": "description of text style",
    "composition": "rule of thirds/centered/asymmetric/etc"
  },
  
  "targetAudience": "inferred target demographic",
  "tone": "professional/playful/urgent/educational/etc",
  
  "keySellingPoints": ["point1", "point2", "point3"],
  
  "notes": "Any additional observations"
}

Be extremely detailed and accurate. Extract ALL text exactly as written. Provide specific color codes, positions, and descriptions. This analysis will be used to generate a similar but unique creative.`;

/**
 * Template for Midjourney character generation
 */
export function buildMidjourneyPrompt(analysis) {
    const { people, mainObject, style, secondaryObjects } = analysis;
    
    let prompt = '';
    
    if (people?.present) {
        prompt = `professional portrait photography of ${people.age} ${people.gender}, `;
        prompt += `${people.emotion} expression, ${people.action || 'looking at camera'}, `;
        prompt += `wearing ${people.clothing || 'casual modern clothes'}, `;
        prompt += `${style === 'realistic' ? 'photorealistic, studio lighting' : style}, `;
    } else if (mainObject) {
        prompt = `${mainObject}, professional product photography, `;
        prompt += `${style}, high quality, `;
    }
    
    if (secondaryObjects?.length) {
        prompt += `with ${secondaryObjects.slice(0, 2).join(' and ')}, `;
    }
    
    prompt += 'clean background, professional composition, 8k, highly detailed --v 6 --ar 1:1';
    
    return prompt;
}

/**
 * Template for Flux background generation
 */
export function buildFluxPrompt(analysis) {
    const { backgroundType, backgroundDescription, colors, style } = analysis;
    
    let prompt = '';
    
    switch (backgroundType) {
        case 'gradient':
            prompt = `smooth gradient background transitioning from ${colors[0]} to ${colors[1]}, `;
            prompt += 'modern, professional, clean, suitable for advertising';
            break;
            
        case 'photo':
            prompt = `${backgroundDescription || 'abstract modern'} background, `;
            prompt += 'slightly blurred, bokeh effect, ';
            prompt += `color palette: ${colors.slice(0, 3).join(', ')}, `;
            prompt += 'professional, high-end, advertising quality';
            break;
            
        case 'solid':
            prompt = `solid ${colors[0]} background, clean, minimal, professional`;
            break;
            
        case 'complex':
            prompt = `${backgroundDescription}, ${style}, `;
            prompt += `color scheme: ${colors.slice(0, 3).join(', ')}, `;
            prompt += 'professional advertising background, detailed, high quality';
            break;
            
        default:
            prompt = `abstract modern background, ${colors[0]}, professional, suitable for advertising`;
    }
    
    prompt += ', 8k resolution, high quality';
    
    return prompt;
}

export default {
    ANALYSIS_PROMPT,
    buildMidjourneyPrompt,
    buildFluxPrompt
};

