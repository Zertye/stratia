const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function main() {
    const dataBuffer = fs.readFileSync('Gemini Omni, by StratIA.pdf');
    const parser = new PDFParse();
    
    // Check methods
    console.log('Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
    
    try {
        const result = await parser.loadPDF(dataBuffer);
        console.log('Result type:', typeof result);
        console.log('Result keys:', Object.keys(result));
    } catch(e) {
        console.log('loadPDF error:', e.message);
    }
    
    try {
        const result = await parser.getData(dataBuffer);
        console.log('getData type:', typeof result);
    } catch(e) {
        console.log('getData error:', e.message);
    }
}

main().catch(console.error);
