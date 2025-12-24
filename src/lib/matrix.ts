import * as Rematrix from 'rematrix';

/**
 * Matrix Class
 * a wrapper around rematrix to match the Flipbook logic requirements.
 */
export class Matrix {
    m: Rematrix.Matrix3D;

    constructor(arg?: Rematrix.Matrix3D | number[]) {
        if (arg) {
            this.m = [...arg] as Rematrix.Matrix3D; // Clone and cast
        } else {
            this.m = Rematrix.identity();
        }
    }

    clone() {
        return new Matrix(this.m);
    }

    multiply(m: Rematrix.Matrix3D) {
        // Rematrix multiply order: multiply(a, b) -> b * a (applies a then b)
        // Check legacy behavior: @m = multiply @m, m
        this.m = Rematrix.multiply(this.m, m);
        return this;
    }

    perspective(d: number) {
        return this.multiply(Rematrix.perspective(d));
    }

    transformX(x: number) {
        // x * m[0] + m[12] ... standard matrix vector mult for x component
        // assuming y=0, z=0, w=1
        // Projected x = (x*m00 + y*m10 + z*m20 + m30) / w
        // w = x*m03 + y*m13 + z*m23 + m33
        // Indices in flat array (column-major? Rematrix is CSS order which is column-major)
        // 0  4  8  12
        // 1  5  9  13
        // 2  6  10 14
        // 3  7  11 15

        // m[0] is 0,0. m[12] is 3,0 (Tx).
        // m[3] is 0,3. m[15] is 3,3 (Tw usually 1).

        const m = this.m;
        return (x * m[0] + m[12]) / (x * m[3] + m[15]);
    }

    translate(x: number, y: number) {
        return this.multiply(Rematrix.translate(x, y));
    }

    translate3d(x: number, y: number, z: number) {
        return this.multiply(Rematrix.translate3d(x, y, z));
    }

    rotateY(deg: number) {
        return this.multiply(Rematrix.rotateY(deg));
    }

    toString() {
        return Rematrix.toString(this.m);
    }
}
