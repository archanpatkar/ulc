const Parser = require("./parser");
// **CURRENTLY IGNORE**
// Combinator compiler is a work in progress

// Based on -
// The architecture of symbolic computers book
function compile(ast) {
    if(ast.node == "literal") return ast.val;
    if(ast.node == "lambda") return abstract(ast.param,ast.body);
}

const I = x => x;
const K = x => y => x;
const S = x => y => z => x(z)(y(z));

function abstract(param,body) {
    if(body.node == "var") {
        if(param == body.name) return I
        else return [K,body.name]
    }
    else if(body.node == "literal") return [K,body.val]
    else if(body.node == "lambda") return abstract(param,compile(body))
    else if(body.node == "apply") return [
        [S,  abstract(param,body.exp1)],
        abstract(param,body.exp2)
    ]
    else if(Array.isArray(body)) return [
        [S,  abstract(param,body[0])],
        abstract(param,body[1])
    ]
    console.log(param)
    console.log(body)
}



const p = new Parser();
let o = p.parse(`(\\x. \\y. x) 10`);
console.log(o);
console.log(compile(o));