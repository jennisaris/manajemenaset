import pg from 'pg';
const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://aset_user:change-me@127.0.0.1:5432/aset_universitas';

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    console.log('Connecting to PostgreSQL database...');
    const duplicates = await pool.query(`
      SELECT asset_code, COUNT(*) as count 
      FROM assets 
      WHERE asset_code IS NOT NULL AND TRIM(asset_code) != '' 
      GROUP BY asset_code 
      HAVING COUNT(*) > 1
    `);

    console.log(`Found ${duplicates.rows.length} asset_code(s) with duplicate records in PostgreSQL.`);

    let totalDeleted = 0;
    for (const dup of duplicates.rows) {
      const rows = await pool.query(
        `SELECT id, asset_code, asset_name, nama_barang, merk FROM assets WHERE asset_code = $1 ORDER BY id ASC`,
        [dup.asset_code]
      );
      
      const deleteIds = rows.rows.slice(0, rows.rows.length - 1).map(r => r.id);
      const keepRow = rows.rows[rows.rows.length - 1];

      console.log(`[DUPLICATE] asset_code: ${dup.asset_code} (${dup.count} entries). Keeping ID ${keepRow.id}, deleting IDs: ${deleteIds.join(', ')}`);

      await pool.query(
        `DELETE FROM assets WHERE id = ANY($1::int[])`,
        [deleteIds]
      );
      totalDeleted += deleteIds.length;
    }

    const updateRes = await pool.query(
      `UPDATE assets SET verification_status = 'terverifikasi' WHERE verification_status != 'terverifikasi'`
    );
    console.log(`Updated ${updateRes.rowCount || 0} assets to 'terverifikasi' status.`);
    console.log(`✅ Postgres cleanup finished. Total deleted: ${totalDeleted}`);
  } catch (err) {
    console.log('PostgreSQL connection check:', err.message);
  } finally {
    await pool.end();
  }
}

main();
