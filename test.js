const numbers = [10, 20, 30];

const sum = numbers.reduce((a, b) => a + b, 0);

console.log("Sum:", sum);

const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
const data = await response.json();

console.log(data);
