import { createUserSupabaseClient, isSupabaseServerConfigured } from '../lib/supabase-admin.ts';
import { withRlsContext } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  accessToken?: string
) {
  try {
    if (process.env.SQL_HOST) {
      return await withRlsContext(uid, async tx => {
        const now = new Date();
        const result = await tx
          .insert(users)
          .values({
            uid,
            email,
            displayName: displayName ?? null,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: {
              email,
              displayName: displayName ?? null,
              updatedAt: now,
            },
          })
          .returning();

        return result[0];
      });
    }

    if (accessToken && isSupabaseServerConfigured()) {
      const supabase = createUserSupabaseClient(accessToken);
      const { data, error } = await supabase
        .from('users')
        .upsert(
          {
            uid,
            email,
            display_name: displayName ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'uid' }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    }

    return { uid, email, displayName: displayName ?? null };
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database user synchronization failed. Please try again later.', {
      cause: error,
    });
  }
}
