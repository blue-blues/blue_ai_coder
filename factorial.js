/**
 * Calculates the factorial of a given number
 * @param {number} n - The number to calculate factorial for
 * @returns {number} The factorial of n
 * @throws {Error} If n is negative or not an integer
 */
function factorial(n) {
	// Input validation
	if (typeof n !== "number" || !Number.isInteger(n)) {
		throw new Error("Input must be a non-negative integer")
	}

	if (n < 0) {
		throw new Error("Factorial is not defined for negative numbers")
	}

	// Base cases
	if (n === 0 || n === 1) {
		return 1
	}

	// Iterative calculation
	let result = 1
	for (let i = 2; i <= n; i++) {
		result *= i
	}

	return result
}

/**
 * Recursive implementation of factorial
 * @param {number} n - The number to calculate factorial for
 * @returns {number} The factorial of n
 */
function factorialRecursive(n) {
	// Input validation
	if (typeof n !== "number" || !Number.isInteger(n)) {
		throw new Error("Input must be a non-negative integer")
	}

	if (n < 0) {
		throw new Error("Factorial is not defined for negative numbers")
	}

	// Base cases
	if (n === 0 || n === 1) {
		return 1
	}

	// Recursive calculation
	return n * factorialRecursive(n - 1)
}

// Export functions for use in other modules
if (typeof module !== "undefined" && module.exports) {
	module.exports = { factorial, factorialRecursive }
}

/*
TEST CASES:

Basic test cases:
factorial(0) should return 1
factorial(1) should return 1
factorial(2) should return 2
factorial(3) should return 6
factorial(4) should return 24
factorial(5) should return 120
factorial(6) should return 720
factorial(7) should return 5040
factorial(10) should return 3628800

Edge cases:
factorial(-1) should throw an error
factorial(1.5) should throw an error
factorial("5") should throw an error
factorial(null) should throw an error
factorial(undefined) should throw an error

Large numbers:
factorial(12) should return 479001600
factorial(15) should return 1307674368000

To run these tests manually, uncomment the following code:

console.log('Testing factorial function:');
console.log('factorial(0):', factorial(0)); // Expected: 1
console.log('factorial(1):', factorial(1)); // Expected: 1
console.log('factorial(5):', factorial(5)); // Expected: 120
console.log('factorial(10):', factorial(10)); // Expected: 3628800

console.log('\nTesting recursive factorial function:');
console.log('factorialRecursive(0):', factorialRecursive(0)); // Expected: 1
console.log('factorialRecursive(5):', factorialRecursive(5)); // Expected: 120

console.log('\nTesting error cases:');
try {
    factorial(-1);
} catch (e) {
    console.log('factorial(-1) error:', e.message); // Expected: Error message
}

try {
    factorial(1.5);
} catch (e) {
    console.log('factorial(1.5) error:', e.message); // Expected: Error message
}
*/
