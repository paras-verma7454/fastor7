import type { RequestHandler } from 'express';
import { currentUser } from '../../middleware/auth.js';
import { validated } from '../../middleware/validate.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { getProfile, loginEmployee, registerEmployee } from './auth.service.js';

export const register: RequestHandler = async (req, res) => {
  const input = validated<RegisterInput>(req, 'body');
  res.status(201).json({ data: await registerEmployee(input) });
};

export const login: RequestHandler = async (req, res) => {
  const input = validated<LoginInput>(req, 'body');
  res.status(200).json({ data: await loginEmployee(input) });
};

export const me: RequestHandler = async (req, res) => {
  const employee = await getProfile(currentUser(req).id);
  res.status(200).json({ data: employee });
};
