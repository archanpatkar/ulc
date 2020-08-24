// Algorithm based on -
// The architecture of symbolic computers book by Peter Kogge
// It converts AST into S-Exps of S K I combinators and applications
// The S-Exps are taken by the Graph reducer and reduced to a value.

// Basic functionality working
// Add support for if-else
// Clean up the code
const Parser = require("./parser");

const I = x => x;
const K = x => y => x;
const S = x => y => z => x(z)(y(z));
const add = x => y => x + y;
const sub = x => y => x - y;
const mul = x => y => x * y;
const div = x => y => x / y;
const neg = x => -x;
const pair = x => y => f => f(x)(y);
const fst = x => y => x;
const snd = x => y => y;
const t = fst;
const f = snd;

opshandlers = {
    "ADD": add,
    "SUB": sub,
    "MUL": mul,
    "DIV": div,
    "NEG": neg
}

function compile(ast) {
    if (ast.node == "literal") return ast.val;
    else if (ast.node == "pair") return pair(compile(ast.fst))(compile(ast.snd));
    else if (ast.node == "apply") return [compile(ast.exp1), compile(ast.exp2)];
    else if (ast.node == "lambda") return abstract(ast.param, ast.body);
}


function abstract(param, body) {
    console.log("here!");
    console.log(param)
    console.log(body)
    if (body.node == "var") {
        if (param == body.name) return I
        else return [K, body.name]
    }
    else if (body in opshandlers) return [K, opshandlers[body]]
    else if (typeof body == "string" && param == body) return I
    else if (typeof body == "function") return [K, body]
    else if (body.node == "pair") return [K,pair(abstract(param, body.fst))(abstract(param, body.snd))];
    else if (body.node == "literal") return [K, body.val]
    else if (body.node == "lambda") return abstract(param, compile(body))
    else if (body.node == "apply") return [
        [S, abstract(param, body.exp1)],
        abstract(param, body.exp2)
    ];
    else if (Array.isArray(body)) return [
        [S, abstract(param, body[0])],
        abstract(param, body[1])
    ];
    else if (body.node in opshandlers) return [
        [S, [[S, abstract(param, body.node)], abstract(param, body.l)]],
        abstract(param, body.r)
    ];
}
// const p = new Parser();
// let o = p.parse(`\\x. \\y. x`);
// let tru = compile(o);
// console.log(JSON.stringify(compile(o)));
// o = p.parse(`\\x. \\y. y`);
// let fal = compile(o);
// console.log(fal);
// o = p.parse(`(\\x. x*2) 10`);
// console.log(o);
// let temp = compile(o);


// Graph Reduction Machine
// SKIM - S, K, I Machine
// Will take S-exps from the combinator compiler and will perform reduction
function reduce(sexp) {
    console.log(sexp);
    if(Array.isArray(sexp)) {
        if (Array.isArray(sexp[0])) {
            let f = sexp[0].r ? sexp[0].r : reduce(sexp[0]);
            let x = typeof sexp[1] == "object" ? sexp[1].r ? sexp[1].r : reduce(sexp[1]) : sexp[1];
            return (sexp.r = f(x));
        }
        else if (typeof sexp[0] == "function") {
            let x = typeof sexp[1] == "object" ? sexp[1].r ? sexp[1].r : reduce(sexp[1]) : sexp[1];
            return (sexp.r = sexp[0](x));
        }
    }
    return sexp;
}

// console.log(reduce(temp))
// o = p.parse(`(\\x. (x,x*x)) 10`);
// console.log("------PAIR-----")
// temp = compile(o);
// console.log(reduce(temp));