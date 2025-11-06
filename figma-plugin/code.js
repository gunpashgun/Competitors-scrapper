// Figma Plugin - Creative Generator for FB Ads
// Automatically creates 1080x1350 portrait ads with layers

// Show UI
figma.showUI(__html__, { width: 400, height: 600 });

const FONT_STYLES = ['Regular', 'Medium', 'SemiBold', 'Semi Bold', 'Bold', 'ExtraBold', 'Black'];

async function ensureFontsLoaded() {
  await Promise.all(
    FONT_STYLES.map(style =>
      figma.loadFontAsync({ family: 'Inter', style }).catch(() => null)
    )
  );
}

function mapFontWeightToStyle(weight) {
  if (!weight) return 'Regular';
  const normalized = weight.toString().toLowerCase();
  if (normalized.includes('black')) return 'Black';
  if (normalized.includes('extra') || normalized.includes('heavy')) return 'ExtraBold';
  if (normalized.includes('semibold') || normalized.includes('semi')) return 'SemiBold';
  if (normalized.includes('medium')) return 'Medium';
  if (normalized.includes('bold')) return 'Bold';
  if (normalized.includes('light')) return 'Regular';
  return 'Regular';
}

function getOverrideForBlock(blockType, overrides = {}) {
  switch (blockType) {
    case 'headline':
      return overrides.headline;
    case 'subheadline':
    case 'body':
      return overrides.subheadline;
    case 'ctaButton':
      return overrides.cta;
    case 'logo':
      return overrides.logo;
    case 'ageRange':
      return overrides.ageRange;
    default:
      return undefined;
  }
}

function createSolidPaint(hex, fallbackHex, opacity = 1) {
  const rgb = hexToRgb(hex || fallbackHex || '#FFFFFF', true);
  return [{ type: 'SOLID', color: rgb, opacity }];
}

function toUint8Array(bytes) {
  if (!bytes) return null;
  if (bytes instanceof Uint8Array) return bytes;
  if (Array.isArray(bytes)) return new Uint8Array(bytes);
  if (bytes && bytes.buffer) return new Uint8Array(bytes.buffer);
  return null;
}

// Listen for messages from UI
figma.ui.onmessage = async (msg) => {
  
  if (msg.type === 'create-creative') {
    try {
      await createCreative(msg.data);
      figma.notify('✅ Creative created successfully!');
    } catch (error) {
      figma.notify('❌ Error: ' + error.message);
      console.error(error);
    }
  }
  
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

// Main function to create creative using existing preset layout
async function createCreativeFromPreset(data) {
  const {
    headline,
    bodyText,
    cta,
    ageRange,
    primaryColor,
    secondaryColor,
    textColor,
    imageUrl
  } = data;
  
  // Create main frame (1080x1350 - Portrait 4:5)
  const frame = figma.createFrame();
  frame.name = '🎯 FB Ad - ' + new Date().toISOString().split('T')[0];
  frame.resize(1080, 1350);
  frame.x = 0;
  frame.y = 0;
  
  // Set background color
  const bgColor = hexToRgb(primaryColor);
  frame.fills = [{
    type: 'SOLID',
    color: { r: bgColor.r / 255, g: bgColor.g / 255, b: bgColor.b / 255 }
  }];
  
  // Layer 1: Background Rectangle
  const background = figma.createRectangle();
  background.name = '📐 Background';
  background.resize(1080, 1350);
  background.x = 0;
  background.y = 0;
  background.fills = [{
    type: 'SOLID',
    color: { r: bgColor.r / 255, g: bgColor.g / 255, b: bgColor.b / 255 }
  }];
  frame.appendChild(background);
  
  // Layer 2: Logo Area (placeholder)
  const logoArea = figma.createRectangle();
  logoArea.name = '🏷️ Logo Area';
  logoArea.resize(200, 60);
  logoArea.x = 90;
  logoArea.y = 50;
  logoArea.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 },
    opacity: 0.2
  }];
  logoArea.cornerRadius = 10;
  frame.appendChild(logoArea);
  
  // Layer 3: Character/Image Area
  const imageArea = figma.createRectangle();
  imageArea.name = '🎮 Character Area';
  imageArea.resize(900, 600);
  imageArea.x = 90;
  imageArea.y = 150;
  
  // If image URL provided, try to load it
  if (imageUrl && imageUrl.trim()) {
    try {
      const image = await loadImageFromUrl(imageUrl);
      imageArea.fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: 'FILL'
      }];
    } catch (error) {
      // Fallback to placeholder
      imageArea.fills = [{
        type: 'SOLID',
        color: { r: 0.5, g: 0.5, b: 0.5 },
        opacity: 0.3
      }];
    }
  } else {
    // Placeholder
    imageArea.fills = [{
      type: 'SOLID',
      color: { r: 0.5, g: 0.5, b: 0.5 },
      opacity: 0.3
    }];
  }
  
  imageArea.cornerRadius = 20;
  imageArea.strokes = [{
    type: 'SOLID',
    color: hexToRgb(secondaryColor, true)
  }];
  imageArea.strokeWeight = 4;
  imageArea.strokeAlign = 'INSIDE';
  frame.appendChild(imageArea);
  
  // Layer 4: Headline Text
  const headlineText = figma.createText();
  headlineText.name = '📰 Headline';
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  headlineText.fontName = { family: 'Inter', style: 'Bold' };
  headlineText.fontSize = 48;
  headlineText.characters = headline || 'Belajar coding lewat\nMinecraft & Roblox! 🎮';
  headlineText.textAlignHorizontal = 'CENTER';
  headlineText.resize(900, headlineText.height);
  headlineText.x = 90;
  headlineText.y = 800;
  const secColor = hexToRgb(secondaryColor);
  headlineText.fills = [{
    type: 'SOLID',
    color: { r: secColor.r / 255, g: secColor.g / 255, b: secColor.b / 255 }
  }];
  frame.appendChild(headlineText);
  
  // Layer 5: Body Text
  const body = figma.createText();
  body.name = '📝 Body Text';
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  body.fontName = { family: 'Inter', style: 'Regular' };
  body.fontSize = 28;
  body.characters = bodyText || 'Kami akan mengajarkan mereka pemrograman\ndi dalam permainan favorit mereka!';
  body.textAlignHorizontal = 'CENTER';
  body.resize(900, body.height);
  body.x = 90;
  body.y = 950;
  const txtColor = hexToRgb(textColor);
  body.fills = [{
    type: 'SOLID',
    color: { r: txtColor.r / 255, g: txtColor.g / 255, b: txtColor.b / 255 }
  }];
  frame.appendChild(body);
  
  // Layer 6: Age Range
  const age = figma.createText();
  age.name = '👶 Age Range';
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  age.fontName = { family: 'Inter', style: 'Medium' };
  age.fontSize = 24;
  age.characters = ageRange || 'Usia: 8-17 tahun';
  age.textAlignHorizontal = 'CENTER';
  age.resize(900, age.height);
  age.x = 90;
  age.y = 1070;
  age.fills = [{
    type: 'SOLID',
    color: { r: secColor.r / 255, g: secColor.g / 255, b: secColor.b / 255 }
  }];
  frame.appendChild(age);
  
  // Layer 7: CTA Button Background
  const ctaButton = figma.createRectangle();
  ctaButton.name = '🎯 CTA Button';
  ctaButton.resize(600, 100);
  ctaButton.x = 240;
  ctaButton.y = 1180;
  ctaButton.fills = [{
    type: 'SOLID',
    color: { r: secColor.r / 255, g: secColor.g / 255, b: secColor.b / 255 }
  }];
  ctaButton.cornerRadius = 50;
  frame.appendChild(ctaButton);
  
  // Layer 8: CTA Button Text
  const ctaText = figma.createText();
  ctaText.name = '🚀 CTA Text';
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  ctaText.fontName = { family: 'Inter', style: 'Bold' };
  ctaText.fontSize = 32;
  ctaText.characters = cta || 'COBA GRATIS! 🚀';
  ctaText.textAlignHorizontal = 'CENTER';
  ctaText.resize(600, ctaText.height);
  ctaText.x = 240;
  ctaText.y = 1205;
  ctaText.fills = [{
    type: 'SOLID',
    color: { r: bgColor.r / 255, g: bgColor.g / 255, b: bgColor.b / 255 }
  }];
  frame.appendChild(ctaText);
  
  // Select the created frame
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
  
  // Send success message
  figma.ui.postMessage({
    type: 'creation-complete',
    frameId: frame.id
  });
}

// Entry point that decides which creation strategy to use
async function createCreative(data) {
  // If a competitor URL is provided and local API is enabled, fetch cleaned image + layout first
  if (data.competitorUrl && data.useLocalApi && data.apiBase) {
    try {
      const payload = { imageUrl: data.competitorUrl };
      const resp = await fetch(`${data.apiBase.replace(/\/$/, '')}/inpaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`Local API HTTP ${resp.status}`);
      const result = await resp.json();
      if (result && result.imageB64) {
        const bytes = Uint8Array.from(atob(result.imageB64), c => c.charCodeAt(0));
        data.cleanImageBytes = Array.from(bytes);
        data.cleanImageName = result.fileName || 'clean.png';
      }
      if (result && result.layout) {
        data.layout = result.layout;
        data.layoutSourceName = 'inpainting-data.json';
      }
    } catch (error) {
      figma.notify('⚠️ Не удалось получить данные из локального API');
      console.error(error);
    }
  }

  if (data.layout && (Array.isArray(data.cleanImageBytes) || data.imageUrl)) {
    await createCreativeFromLayout(data);
    return;
  }

  await createCreativeFromPreset(data);
}

async function createCreativeFromLayout(data) {
  const layout = data.layout || {};
  const textBlocks = Array.isArray(layout.textBlocks) ? layout.textBlocks : [];

  const originalDimensions = layout.originalDimensions || layout.originalDimensions || {
    width: 1080,
    height: 1350
  };

  const analysisSpace = layout.analysisCoordinateSpace || layout.analysisDimensions || originalDimensions;

  const frameWidth = (analysisSpace && analysisSpace.width) || originalDimensions.width || 1080;
  const frameHeight = (analysisSpace && analysisSpace.height) || originalDimensions.height || 1350;

  const frame = figma.createFrame();
  const suffix = data.layoutSourceName ? ` - ${data.layoutSourceName}` : '';
  frame.name = `🎯 Clean Creative${suffix}`;
  frame.resize(frameWidth, frameHeight);
  frame.x = 0;
  frame.y = 0;
  frame.fills = [];

  const colors = {
    primary: data.primaryColor || '#1A1A1A',
    secondary: data.secondaryColor || '#FFD700',
    text: data.textColor || '#FFFFFF'
  };

  const imageBytes = toUint8Array(data.cleanImageBytes);
  if (imageBytes && imageBytes.length) {
    const image = figma.createImage(imageBytes);
    const background = figma.createRectangle();
    background.name = '🖼️ Clean Background';
    background.resize(frameWidth, frameHeight);
    background.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
    frame.appendChild(background);
  } else if (data.imageUrl) {
    try {
      const remoteImage = await loadImageFromUrl(data.imageUrl);
      const background = figma.createRectangle();
      background.name = '🖼️ Background Image';
      background.resize(frameWidth, frameHeight);
      background.fills = [{ type: 'IMAGE', imageHash: remoteImage.hash, scaleMode: 'FILL' }];
      frame.appendChild(background);
    } catch (error) {
      const fallbackBackground = figma.createRectangle();
      fallbackBackground.name = '📐 Background';
      fallbackBackground.resize(frameWidth, frameHeight);
      fallbackBackground.fills = createSolidPaint(colors.primary, '#1A1A1A');
      frame.appendChild(fallbackBackground);
    }
  } else {
    const fallbackBackground = figma.createRectangle();
    fallbackBackground.name = '📐 Background';
    fallbackBackground.resize(frameWidth, frameHeight);
    fallbackBackground.fills = createSolidPaint(colors.primary, '#1A1A1A');
    frame.appendChild(fallbackBackground);
  }

  await ensureFontsLoaded();

  const scaleX = (analysisSpace && analysisSpace.width) ? frameWidth / analysisSpace.width : 1;
  const scaleY = (analysisSpace && analysisSpace.height) ? frameHeight / analysisSpace.height : 1;

  for (const block of textBlocks) {
    createLayerFromBlock(frame, block, {
      scaleX,
      scaleY,
      colors,
      overrides: data.textOverrides || {}
    });
  }

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);

  figma.ui.postMessage({
    type: 'creation-complete',
    frameId: frame.id,
    mode: 'layout',
    layoutSource: data.layoutSourceName || null
  });
}

function createLayerFromBlock(frame, block, context) {
  const { scaleX, scaleY, colors, overrides } = context;
  const x = (block.x || 0) * scaleX;
  const y = (block.y || 0) * scaleY;
  const width = (block.width || 0) * scaleX;
  const height = (block.height || 0) * scaleY;
  const fontStyle = mapFontWeightToStyle(block.fontWeight);
  const baseFontSize = block.fontSize || 32;
  const fontSize = Math.max(8, baseFontSize * scaleY);
  const textColor = block.color || colors.text;
  const overrideText = getOverrideForBlock(block.type, overrides);
  const textContent = (overrideText !== undefined && overrideText !== null) ? overrideText : (block.newText || block.originalText || '');

  switch (block.type) {
    case 'logo':
      createLogoLayer(frame, { x, y, width, height, textColor, textContent, colors, fontStyle, fontSize, scaleY, block });
      break;
    case 'ctaButton':
      createCtaLayer(frame, { x, y, width, height, textColor, textContent, colors, fontSize, scaleY, block });
      break;
    case 'priceSection':
      createPriceLayer(frame, { x, y, width, height, colors, block, scaleY });
      break;
    default:
      const labelMap = {
        headline: '📰 Headline',
        subheadline: '📝 Subheadline',
        body: '📝 Body Text',
        caption: '💬 Caption',
        ageRange: '👶 Age Range'
      };
      const displayName = labelMap[block.type] || (block.type ? `🔤 ${block.type}` : '🔤 Text');
      createTextLayer(frame, {
        name: displayName,
        x,
        y,
        width,
        height,
        fontStyle,
        fontSize,
        color: textColor,
        textAlign: block.textAlign,
        lineHeight: block.lineHeight,
        textContent,
        block
      });
      break;
  }
}

function createTextLayer(frame, options) {
  const {
    name,
    x,
    y,
    width,
    fontStyle,
    fontSize,
    color,
    textAlign,
    lineHeight,
    textContent,
    block
  } = options;

  if (!textContent) return;

  const textNode = figma.createText();
  textNode.name = name;
  textNode.fontName = { family: 'Inter', style: fontStyle };
  textNode.fontSize = fontSize;
  textNode.characters = textContent;
  textNode.textAutoResize = 'HEIGHT';

  if (lineHeight) {
    textNode.lineHeight = { unit: 'PERCENT', value: lineHeight };
  } else {
    textNode.lineHeight = { unit: 'AUTO' };
  }

  const alignment = textAlign ? textAlign.toString().toUpperCase() : 'LEFT';
  if (alignment === 'CENTER') {
    textNode.textAlignHorizontal = 'CENTER';
  } else if (alignment === 'RIGHT') {
    textNode.textAlignHorizontal = 'RIGHT';
  } else {
    textNode.textAlignHorizontal = 'LEFT';
  }

  textNode.fills = createSolidPaint(color, '#FFFFFF');

  // Add stroke if specified
  if (block && block.hasStroke) {
    const strokeColor = block.strokeColor || '#000000';
    const strokeWeight = block.strokeWeight || 2;
    const strokeRgb = hexToRgb(strokeColor, true);
    
    textNode.strokes = [{
      type: 'SOLID',
      color: strokeRgb
    }];
    textNode.strokeWeight = strokeWeight;
    textNode.strokeAlign = 'OUTSIDE';
  }

  if (width > 0) {
    try {
      textNode.resize(width, textNode.height);
    } catch (error) {
      // ignore resize errors (e.g., extremely small width)
    }
  }

  textNode.x = x;
  textNode.y = y;
  frame.appendChild(textNode);
}

function createLogoLayer(frame, options) {
  const { x, y, width, textColor, textContent, colors, fontStyle, fontSize, block } = options;
  
  if (!textContent) return;

  const textNode = figma.createText();
  textNode.name = '🏷️ Logo';
  textNode.fontName = { family: 'Inter', style: fontStyle || 'Bold' };
  textNode.fontSize = fontSize || 16;
  textNode.characters = textContent;
  textNode.textAutoResize = 'HEIGHT';
  textNode.fills = createSolidPaint(textColor, colors.text);

  const alignment = block.textAlign ? block.textAlign.toString().toUpperCase() : 'RIGHT';
  if (alignment === 'CENTER') {
    textNode.textAlignHorizontal = 'CENTER';
  } else if (alignment === 'LEFT') {
    textNode.textAlignHorizontal = 'LEFT';
  } else {
    textNode.textAlignHorizontal = 'RIGHT';
  }

  if (width > 0) {
    try {
      textNode.resize(width, textNode.height);
    } catch (error) {
      // ignore resize errors
    }
  }

  textNode.x = x;
  textNode.y = y;
  frame.appendChild(textNode);
}

function createCtaLayer(frame, options) {
  const { x, y, width, height, textColor, textContent, colors, fontSize, scaleY, block } = options;
  
  // Check if it's a circle or rounded rectangle
  const isCircle = block.shape === 'circle';
  const buttonWidth = isCircle ? width : Math.max(width, 320 * scaleY);
  const buttonHeight = isCircle ? height : Math.max(height, 90 * scaleY);

  const ctaShape = isCircle ? figma.createEllipse() : figma.createRectangle();
  ctaShape.name = '🎯 CTA Button';
  ctaShape.resize(buttonWidth, buttonHeight);
  ctaShape.x = x;
  ctaShape.y = y;
  
  if (!isCircle && ctaShape.cornerRadius !== undefined) {
    ctaShape.cornerRadius = block.cornerRadius ? block.cornerRadius * scaleY : Math.min(buttonHeight / 2, 40 * scaleY);
  }
  
  ctaShape.fills = createSolidPaint(block.backgroundColor, colors.secondary);
  frame.appendChild(ctaShape);

  if (!textContent) return;

  const ctaText = figma.createText();
  ctaText.name = '🚀 CTA Text';
  ctaText.fontName = { family: 'Inter', style: mapFontWeightToStyle(block.fontWeight) || 'Bold' };
  ctaText.fontSize = fontSize || 18;
  ctaText.characters = textContent;
  ctaText.textAutoResize = isCircle ? 'WIDTH_AND_HEIGHT' : 'HEIGHT';
  ctaText.textAlignHorizontal = 'CENTER';
  ctaText.fills = createSolidPaint(textColor, colors.primary);

  if (!isCircle) {
    try {
      ctaText.resize(buttonWidth - 24, ctaText.height);
    } catch (error) {
      // ignore resize errors
    }
  }

  const textPadding = isCircle ? buttonWidth * 0.15 : 12;
  const maxWidth = buttonWidth - (textPadding * 2);
  
  try {
    if (isCircle && ctaText.width > maxWidth) {
      ctaText.resize(maxWidth, ctaText.height);
    }
  } catch (error) {
    // ignore
  }

  ctaText.x = x + (buttonWidth - ctaText.width) / 2;
  ctaText.y = y + (buttonHeight - ctaText.height) / 2;
  frame.appendChild(ctaText);
}

function createPriceLayer(frame, options) {
  const { x, y, width, colors, block, scaleY } = options;
  
  // Create background card if present
  if (block.hasBackgroundCard) {
    const cardX = block.cardX || x;
    const cardY = block.cardY || y;
    const cardWidth = block.cardWidth || width || 200;
    const cardHeight = block.cardHeight || 80;
    const cardRadius = block.cardCornerRadius || 20;
    
    const cardRect = figma.createRectangle();
    cardRect.name = '💳 Price Card';
    cardRect.resize(cardWidth, cardHeight);
    cardRect.x = cardX;
    cardRect.y = cardY;
    cardRect.cornerRadius = cardRadius;
    cardRect.fills = createSolidPaint(block.cardBackgroundColor || '#FFFFFF', '#FFFFFF');
    frame.appendChild(cardRect);
  }
  
  const oldPrice = block.newOldPrice || block.originalOldPrice || ''; 
  const newPrice = block.newNewPrice || block.originalNewPrice || block.newText || '';
  const textColor = block.color || colors.text;
  const baseOldFont = block.oldPriceFontSize || 24;
  const baseNewFont = block.newPriceFontSize || 32;
  const oldFontSize = Math.max(12, baseOldFont * scaleY);
  const newFontSize = Math.max(14, baseNewFont * scaleY);
  
  // Use textX/textY if provided, otherwise use x/y
  const textBaseX = block.textX || x;
  const textBaseY = block.textY || y;

  if (oldPrice) {
    const oldPriceNode = figma.createText();
    oldPriceNode.name = '💲 Old Price';
    oldPriceNode.fontName = { family: 'Inter', style: 'Regular' };
    oldPriceNode.fontSize = oldFontSize;
    oldPriceNode.characters = oldPrice;
    oldPriceNode.textAutoResize = 'HEIGHT';
    oldPriceNode.textDecoration = 'STRIKETHROUGH';
    oldPriceNode.fills = createSolidPaint(textColor, colors.text, 0.6);
    if (width > 0) {
      try {
        oldPriceNode.resize(width, oldPriceNode.height);
      } catch (error) {
        // ignore
      }
    }
    oldPriceNode.x = textBaseX;
    oldPriceNode.y = textBaseY;
    frame.appendChild(oldPriceNode);
  }

  if (newPrice) {
    const newPriceNode = figma.createText();
    newPriceNode.name = '💲 New Price';
    newPriceNode.fontName = { family: 'Inter', style: 'Bold' };
    newPriceNode.fontSize = newFontSize;
    newPriceNode.characters = newPrice;
    newPriceNode.textAutoResize = 'HEIGHT';
    newPriceNode.fills = createSolidPaint(textColor, colors.text);
    if (width > 0) {
      try {
        newPriceNode.resize(width, newPriceNode.height);
      } catch (error) {
        // ignore
      }
    }
    const offsetY = oldPrice ? newFontSize * 0.6 + oldFontSize : 0;
    newPriceNode.x = textBaseX;
    newPriceNode.y = textBaseY + offsetY;
    frame.appendChild(newPriceNode);
  }
}

// Helper: Convert hex to RGB
function hexToRgb(hex, normalized = false) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  
  const rgb = {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
  
  if (normalized) {
    return {
      r: rgb.r / 255,
      g: rgb.g / 255,
      b: rgb.b / 255
    };
  }
  
  return rgb;
}

// Helper: Load image from URL
async function loadImageFromUrl(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const image = figma.createImage(uint8Array);
    return image;
  } catch (error) {
    throw new Error('Failed to load image from URL');
  }
}

