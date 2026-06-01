import { parseNumber } from '../src/lib/parser/meal-analyzer';

function testVal(val: any) {
  console.log(`Input: "${val}" -> Parsed: ${parseNumber(val)}`);
}

console.log('--- TESTING CURRENCY PARSER ---');
testVal('41.050.000');
testVal('1.900.000');
testVal('41,050,000');
testVal('1,900,000');
testVal('41050000');
testVal('1900000');
testVal('1.500.000,50');
testVal('1,500,000.50');
testVal('1.900');
testVal('1,900');
testVal('1.9');
testVal('1,9');
testVal(1900000);
testVal({ result: '41.050.000' });
testVal({ result: 1900000 });
console.log('-------------------------------');
