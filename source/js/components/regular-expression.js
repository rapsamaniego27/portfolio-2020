let pattern;

/* Regular expression pattern */
pattern = /hello/i;

//String to match
const str = 'Hello';

//Log Results
const result = pattern.exec(str);
console.log(result);


/* Function to test if the str passes the pattern. */
function patternTest(pattern, str){
 if(pattern.test(str)){
  console.log(`${str} matches ${pattern.source}`);
 }else{
  console.log(`${str} does NOT match ${pattern.source}`);
 }
}

patternTest(pattern, str);