"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(schema, source = 'body') {
    return (req, _res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            // ZodError → errorMiddleware → 422 Unprocessable Entity
            next(result.error);
            return;
        }
        // Replace with parsed + coerced data (e.g. trimmed strings, defaults)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req[source] = result.data;
        next();
    };
}
//# sourceMappingURL=validate.middleware.js.map