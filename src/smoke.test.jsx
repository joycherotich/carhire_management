import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('every route renders', () => {
  for (const path of ['/', '/bookings', '/bookings/bk_1', '/calendar', '/vehicles', '/payments', '/expenses', '/profitability', '/fuel', '/maintenance', '/customers', '/reports', '/notifications', '/settings', '/login']) {
    it(path, () => {
      const html = renderToString(<MemoryRouter initialEntries={[path]}><App testUser={path === '/login' ? null : { name: 'Joy' }} /></MemoryRouter>);
      expect(html.length).toBeGreaterThan(500);
    });
  }
});
