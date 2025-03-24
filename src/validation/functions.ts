const minErrorMsg = (n: number) => `Mínimo ${n} caracteres`;
const maxErrorMsg = (n: number) => `Máximo ${n} caracteres`;
const emailErrorMsg = "Email inválido";
const phoneNumberErrorMsg = "Solo se permiten caracteres numéricos";
const noSpacesErrorMsg = "No se permiten espacios";
const passwordDontMatchErrorMsg = "Las contraseñas no coinciden";
const minNumberErrorMsg = (n: number) => `Mínimo ${n}`;
const maxNumberErrorMsg = (n: number) => `Máximo ${n}`;

export const messages = {
  minErrorMsg,
  maxErrorMsg,
  emailErrorMsg,
  phoneNumberErrorMsg,
  noSpacesErrorMsg,
  passwordDontMatchErrorMsg,
  minNumberErrorMsg,
  maxNumberErrorMsg,
};
