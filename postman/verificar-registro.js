pm.test("Crea el usuario", () => pm.response.to.have.status(201));
pm.test("Entrega datos públicos", () => {
  const usuario = pm.response.json();
  pm.expect(usuario.id).to.match(/^[0-9a-f-]{36}$/);
  pm.expect(usuario.perfil.nombres).to.equal("Ana");
  pm.expect(usuario.correo).to.equal("registro-postman@example.com");
  pm.expect(usuario).not.to.have.property("equipo");
  pm.expect(usuario).not.to.have.property("clave");
});
