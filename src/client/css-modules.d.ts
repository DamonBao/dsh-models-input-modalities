/** CSS Modules class maps; the plugin bundle inlines the stylesheet itself. */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
