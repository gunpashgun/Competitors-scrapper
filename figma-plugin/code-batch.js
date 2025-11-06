// Batch Creative Generator for Figma
// Loads processed creatives from Apify Dataset and creates multiple frames

figma.showUI(__html__, { width: 500, height: 600 });

// Font styles mapping
const FONT_STYLES = [
  'Thin', 'ExtraLight', 'Light', 'Regular', 'Medium', 
  'SemiBold', 'Bold', 'ExtraBold', 'Black'
];

function mapFontWeightToStyle(weight) {
  const weightMap = {
    'thin': 'Thin',
    'extralight': 'ExtraLight',
    'light': 'Light',
    'regular': 'Regular',
    'normal': 'Regular',
    'medium': 'Medium',
    'semibold': 'SemiBold',
    'bold': 'Bold',
    'extrabold': 'ExtraBold',
    'black': 'Black'
  };
  
  const normalized = (weight || '').toLowerCase().trim();
  return weightMap[normalized] || 'Regular';
}

async function loadFonts() {
  const fontsToLoad = FONT_STYLES.map(style => ({
    family: 'Inter',
    style: style
  }));
  
  for (const font of fontsToLoad) {
    try {
      await figma.loadFontAsync(font);
    } catch (e) {
      console.warn('Could not load font:', font, e);
    }
  }
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

async function createCreativeFrame(data, x, y) {
  const { cleanImageBase64, layoutData } = data;
  
  // Create main frame
  const frame = figma.createFrame();
  frame.name = layoutData.originalDimensions ? 
    `Creative ${layoutData.originalDimensions.width}x${layoutData.originalDimensions.height}` : 
    'Creative';
  
  frame.x = x;
  frame.y = y;
  
  // Set frame size from original dimensions
  if (layoutData.originalDimensions) {
    frame.resize(
      layoutData.originalDimensions.width,
      layoutData.originalDimensions.height
    );
  } else {
    frame.resize(720, 1280); // Default
  }
  
  frame.clipsContent = true;
  frame.fills = [];
  
  // Add background image
  const imageBytes = base64ToUint8Array(cleanImageBase64);
  const imageHash = figma.createImage(imageBytes).hash;
  
  const bgRect = figma.createRectangle();
  bgRect.name = 'Background';
  bgRect.resize(frame.width, frame.height);
  bgRect.fills = [{
    type: 'IMAGE',
    imageHash: imageHash,
    scaleMode: 'FILL'
  }];
  
  frame.appendChild(bgRect);
  
  // Add logo
  if (layoutData.logo) {
    const logo = layoutData.logo;
    const logoText = figma.createText();
    logoText.name = 'Logo';
    
    const fontStyle = mapFontWeightToStyle(logo.fontWeight);
    await figma.loadFontAsync({ family: 'Inter', style: fontStyle });
    logoText.fontName = { family: 'Inter', style: fontStyle };
    
    logoText.characters = logo.text || 'YourBrand';
    logoText.fontSize = logo.fontSize || 24;
    logoText.fills = [{ type: 'SOLID', color: hexToRgb(logo.color || '#FFFFFF') }];
    
    logoText.x = logo.x || 0;
    logoText.y = logo.y || 0;
    
    if (logo.textAlign === 'center') {
      logoText.textAlignHorizontal = 'CENTER';
    } else if (logo.textAlign === 'right') {
      logoText.textAlignHorizontal = 'RIGHT';
    }
    
    frame.appendChild(logoText);
  }
  
  // Add text blocks
  if (layoutData.textBlocks && Array.isArray(layoutData.textBlocks)) {
    for (const block of layoutData.textBlocks) {
      const textNode = figma.createText();
      textNode.name = block.type || 'Text';
      
      const fontStyle = mapFontWeightToStyle(block.fontWeight);
      await figma.loadFontAsync({ family: 'Inter', style: fontStyle });
      textNode.fontName = { family: 'Inter', style: fontStyle };
      
      textNode.characters = block.text || '';
      textNode.fontSize = block.fontSize || 16;
      textNode.fills = [{ type: 'SOLID', color: hexToRgb(block.color || '#FFFFFF') }];
      
      if (block.lineHeight) {
        textNode.lineHeight = { value: block.lineHeight, unit: 'PERCENT' };
      }
      
      // Position
      textNode.x = block.x || 0;
      textNode.y = block.y || 0;
      
      // Width constraint
      if (block.width) {
        textNode.resize(block.width, textNode.height);
        textNode.textAutoResize = 'HEIGHT';
      }
      
      // Alignment
      if (block.textAlign === 'center') {
        textNode.textAlignHorizontal = 'CENTER';
      } else if (block.textAlign === 'right') {
        textNode.textAlignHorizontal = 'RIGHT';
      }
      
      // Stroke (for caption)
      if (block.hasStroke) {
        textNode.strokes = [{ 
          type: 'SOLID', 
          color: hexToRgb(block.strokeColor || '#000000') 
        }];
        textNode.strokeWeight = block.strokeWeight || 2;
        textNode.strokeAlign = block.strokeAlign || 'OUTSIDE';
      }
      
      frame.appendChild(textNode);
    }
  }
  
  // Add CTA button
  if (layoutData.ctaButton) {
    const cta = layoutData.ctaButton;
    
    let buttonShape;
    if (cta.shape === 'circle') {
      buttonShape = figma.createEllipse();
      buttonShape.name = 'CTA Button';
      const size = Math.min(cta.width || 60, cta.height || 60);
      buttonShape.resize(size, size);
    } else {
      buttonShape = figma.createRectangle();
      buttonShape.name = 'CTA Button';
      buttonShape.resize(cta.width || 120, cta.height || 40);
      buttonShape.cornerRadius = cta.cornerRadius || 100;
    }
    
    buttonShape.fills = [{ type: 'SOLID', color: hexToRgb(cta.backgroundColor || '#FFFFFF') }];
    buttonShape.x = cta.x || 0;
    buttonShape.y = cta.y || 0;
    
    frame.appendChild(buttonShape);
    
    // CTA Text
    if (cta.text) {
      const ctaText = figma.createText();
      ctaText.name = 'CTA Text';
      
      const fontStyle = mapFontWeightToStyle(cta.fontWeight);
      await figma.loadFontAsync({ family: 'Inter', style: fontStyle });
      ctaText.fontName = { family: 'Inter', style: fontStyle };
      
      ctaText.characters = cta.text;
      ctaText.fontSize = cta.fontSize || 14;
      ctaText.fills = [{ type: 'SOLID', color: hexToRgb(cta.textColor || '#000000') }];
      
      // Center text in button
      ctaText.textAlignHorizontal = 'CENTER';
      ctaText.textAlignVertical = 'CENTER';
      
      ctaText.x = (cta.x || 0) + (buttonShape.width - ctaText.width) / 2;
      ctaText.y = (cta.y || 0) + (buttonShape.height - ctaText.height) / 2;
      
      frame.appendChild(ctaText);
    }
  }
  
  // Add price section
  if (layoutData.priceSection) {
    const price = layoutData.priceSection;
    
    // Background card
    if (price.hasBackgroundCard) {
      const card = figma.createRectangle();
      card.name = 'Price Card';
      card.resize(price.cardWidth || 120, price.cardHeight || 50);
      card.x = price.cardX || 0;
      card.y = price.cardY || 0;
      card.cornerRadius = price.cardCornerRadius || 8;
      card.fills = [{ type: 'SOLID', color: hexToRgb(price.cardBackgroundColor || '#FFFFFF') }];
      
      frame.appendChild(card);
    }
    
    // Price text
    const priceText = figma.createText();
    priceText.name = 'Price';
    
    const fontStyle = mapFontWeightToStyle(price.fontWeight);
    await figma.loadFontAsync({ family: 'Inter', style: fontStyle });
    priceText.fontName = { family: 'Inter', style: fontStyle };
    
    let priceStr = '';
    if (price.oldPrice) {
      priceStr += price.oldPrice + '  ';
    }
    if (price.newPrice) {
      priceStr += price.newPrice;
    }
    
    priceText.characters = priceStr || price.text || '';
    priceText.fontSize = price.newPriceFontSize || price.fontSize || 18;
    priceText.fills = [{ type: 'SOLID', color: hexToRgb(price.color || '#000000') }];
    
    priceText.x = price.textX || price.x || 0;
    priceText.y = price.textY || price.y || 0;
    
    if (price.textAlign === 'center') {
      priceText.textAlignHorizontal = 'CENTER';
    }
    
    frame.appendChild(priceText);
  }
  
  return frame;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate-batch') {
    try {
      await loadFonts();
      
      const { dataset, gridColumns, gridSpacing } = msg;
      const creativeWidth = 720; // Default, will be overridden by actual dimensions
      const creativeHeight = 1280;
      
      let currentX = 0;
      let currentY = 0;
      let maxHeightInRow = 0;
      let createdCount = 0;
      
      for (let i = 0; i < dataset.length; i++) {
        const data = dataset[i];
        
        // Create frame
        const frame = await createCreativeFrame(data, currentX, currentY);
        
        // Track max height in current row
        if (frame.height > maxHeightInRow) {
          maxHeightInRow = frame.height;
        }
        
        createdCount++;
        
        // Move to next position
        if ((i + 1) % gridColumns === 0) {
          // New row
          currentX = 0;
          currentY += maxHeightInRow + gridSpacing;
          maxHeightInRow = 0;
        } else {
          // Same row, next column
          currentX += frame.width + gridSpacing;
        }
      }
      
      // Zoom to fit all creatives
      figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);
      
      figma.ui.postMessage({
        type: 'batch-complete',
        count: createdCount
      });
      
    } catch (error) {
      console.error('Error generating batch:', error);
      figma.ui.postMessage({
        type: 'batch-error',
        error: error.message
      });
    }
  }
};

