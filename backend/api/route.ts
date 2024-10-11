import { routeQuery } from '../app/utils/searchUtils.js';
import { handleApiError } from '../app/utils/errorHandler.js';

export async function handleAudiusQuery(req: any, res: any) {
  try {
    const { query } = req.body;
    const result = await routeQuery(query);
    res.status(200).json(result);
  } catch (error) {
    handleApiError(error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}
