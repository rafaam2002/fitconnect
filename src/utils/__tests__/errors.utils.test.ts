import { createServiceResponse } from '../errors.util';

describe('Errors Utility - createServiceResponse', () => {
  it('debería retornar un objeto de respuesta exitosa estándar', () => {
    const code = 200;
    const message = 'Operación exitosa';
    const data = { id: '123', name: 'Test User' };

    // 2. Act (Ejecutar la función que queremos probar)
    const response = createServiceResponse(code, message, true, data);

    // 3. Assert (Verificar que el resultado sea el esperado)
    expect(response).toEqual({
      code: 200,
      message: 'Operación exitosa',
      success: true,
      id: '123',
      name: 'Test User',
    });
  });

  it('debería funcionar correctamente sin el parámetro data', () => {
    // Arrange & Act
    const response = createServiceResponse(404, 'No encontrado', false);

    // Assert
    expect(response.success).toBe(false);
    expect(response.code).toBe(404);
    expect(response).not.toHaveProperty('id');
  });
});
