import assert from 'node:assert/strict';
import test from 'node:test';
import { getDashboardSummaryQuery } from '../src/lib/server/services/dashboard-service';

test('getDashboardSummaryQuery menghasilkan query agregasi SQL tunggal', () => {
  const sql = getDashboardSummaryQuery();

  assert.ok(sql.includes('count(*) filter (where asset_type = \'land\')'), 'Harus menghitung total_land via FILTER');
  assert.ok(sql.includes('count(*) filter (where asset_type = \'building\')'), 'Harus menghitung total_building via FILTER');
  assert.ok(sql.includes('select count(*) filter (where status in (\'aktif\',\'akan_berakhir\')) from asset_utilizations'), 'Harus menghitung active_utilizations via subquery FILTER tunggal');
  assert.ok(sql.includes('select count(*) filter (where status <> \'selesai\') from asset_issues'), 'Harus menghitung active_issues via subquery FILTER tunggal');
});
