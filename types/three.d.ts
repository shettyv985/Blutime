declare module "three" {
  export class Color {
    constructor(...args: unknown[]);
  }

  export interface IUniform<T = unknown> {
    value: T;
  }

  export class Mesh {
    material: unknown;
    scale: {
      set: (...args: unknown[]) => void;
    };
  }

  export class ShaderMaterial {
    uniforms: Record<string, IUniform>;
  }
}
