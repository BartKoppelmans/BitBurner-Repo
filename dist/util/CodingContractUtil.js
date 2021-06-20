export function findSolution(ns, contract) {
    switch (contract.type) {
        case "Sanitize Parentheses in Expression":
        case "Find Largest Prime Factor":
        case "Subarray with Maximum Sum":
        case "Total Ways to Sum":
        case "Spiralize Matrix":
        case "Array Jumping Game":
        case "Merge Overlapping Intervals":
        case "Generate IP Addresses":
        case "Algorithmic Stock Trader I":
        case "Algorithmic Stock Trader II":
        case "Algorithmic Stock Trader III":
        case "Algorithmic Stock Trader IV":
        case "Minimum Path Sum in a Triangle":
        case "Unique Paths in a Grid I":
        case "Unique Paths in a Grid II":
        case "Find All Valid Math Expressions":
        default:
            throw new Error("No solution has been implemented yet.");
    }
}
