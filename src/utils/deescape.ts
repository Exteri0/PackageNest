export default function deescapeString(input: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    if (input[i] === "\\" && i + 1 < input.length) {
      // Skip the backslash and take the next character
      result += input[i + 1];
      i++; // Skip the next character since it's already added
    } else {
      result += input[i];
    }
  }
  return result;
}
