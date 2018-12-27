function parseExpression(program){
	program = skipSpace(program);
	let match, expr;

	if(match = /^"([^"]*)"/.exec(program))
		expr = {type: "value", value: match[1]};
	else if(match = /^\d+\b/.exec(program))
		expr = {type: "value", value: match[0]};
	else if(match = /^[^\s(),"]+/.exec(program))
		expr = {type: "word", name: match[0]};
	else
		throw new SyntaxError(program);

	return parseApply(expr, program.slice(match[0].length));
}

function skipSpace(string){
	let first = string.search(/\S/);
	if(first == -1){ return ""};

	return string.slice(first);
}

function parseApply(expr, program){
	program = skipSpace(program);

	if(program[0] != "("){ return {expr: expr, rest: program}; }

	program = skipSpace(program.slice(1));
	expr = {type: "apply", operator: expr, args: []};

	while(program[0] != ")"){
		let arg = parseExpression(program);
		expr.args.push(arg.expr);
		program = skipSpace(arg.rest);

		if(program[0] == ","){
			program = skipSpace(program.slice(1));
		}else if(program[0] != ")"){
			throw new SyntaxError("Expected ',' or ')'");
		}
	}
    /*
    * parseApply must, after it has parsed an application
    * call itself again to check whether another pair of parentheses follows.
    */
	return parseApply(expr, program.slice(1));
}

function parse(program){
	let result = parseExpression(program);
	if(skipSpace(result.rest).length > 0){
		throw new SyntaxError("Unexpected text after program");
	}

	return result.expr;
}

function evaluate(expr, env){
	switch(expr.type){
		case "value":
			return expr.value;

		case "word":
			if(expr.name in env){
				return env[expr.name];
			}else{
				throw new ReferenceError("Undefined variable: " + expr.name);
			}
		case "apply":
		    /*specialForms are like if statement*/
			if(expr.operator.type == "word" && expr.operator.name in specialForms){
				return specialForms[expr.operator.name](expr.args, env);
			}

			let op = evaluate(expr.operator, env);
			if(typeof op != "function"){
				throw new TypeError("Applying a non function.");
			}

			return op.apply(null, expr.args.map((arg)=>{
				return evaluate(arg, env);
			}));
	}
}

let specialForms = Object.create(null);

specialForms["if"] = function(args, env){
	if(args.length != 3){
		throw new SyntaxError("Bad number of args to if");
	}

	if(evaluate(args[0], env) !== false){
		return evaluate(args[1], env);
	}else{
		return evaluate(args[2], env);
	}
};