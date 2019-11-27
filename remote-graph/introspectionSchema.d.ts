export interface Pokedex {
    __schema: Schema;
}

export interface Schema {
    queryType:        Type;
    mutationType:     Type;
    subscriptionType: null;
    types:            SchemaType[];
    directives:       Directive[];
}

export interface Directive {
    name:        string;
    description: string;
    locations:   string[];
    args:        Arg[];
}

export interface Arg {
    name:         string;
    description:  null | string;
    type:         InterfaceElement;
    defaultValue: null | string;
}

export interface InterfaceElement {
    kind:   Kind;
    name:   null | string;
    ofType: InterfaceElement | null;
}

export enum Kind {
    Enum = "ENUM",
    Interface = "INTERFACE",
    List = "LIST",
    NonNull = "NON_NULL",
    Object = "OBJECT",
    Scalar = "SCALAR",
}

export interface Type {
    name: string;
}

export interface SchemaType {
    kind:          Kind;
    name:          string;
    description:   null | string;
    fields:        Field[] | null;
    inputFields:   null;
    interfaces:    InterfaceElement[] | null;
    enumValues:    EnumValue[] | null;
    possibleTypes: InterfaceElement[] | null;
}

export interface EnumValue {
    name:              string;
    description:       null | string;
    isDeprecated:      boolean;
    deprecationReason: null;
}

export interface Field {
    name:              string;
    description:       null | string;
    args:              Arg[];
    type:              InterfaceElement;
    isDeprecated:      boolean;
    deprecationReason: null;
}
