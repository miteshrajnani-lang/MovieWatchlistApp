// ==========================================================================
// SUPABASE WATCHLIST DATABASE SERVICE MODULE
// ==========================================================================

const WatchlistDatabaseService = {
    /**
     * Helper to validate a TMDB ID as a positive integer.
     */
    isValidTmdbId(id) {
        return typeof id === 'number' && Number.isInteger(id) && id > 0;
    },

    /**
     * Map a raw Supabase watchlist_items row to an in-memory Movie object
     */
    mapRowToMovie(row) {
        if (!row) return null;
        return {
            id: row.tmdb_id,
            title: row.title !== null && row.title !== undefined ? row.title : 'Untitled Movie',
            release_date: row.release_date !== null && row.release_date !== undefined ? row.release_date : 'N/A',
            vote_average: typeof row.vote_average === 'number' ? row.vote_average : (parseFloat(row.vote_average) || 0),
            vote_count: typeof row.vote_count === 'number' ? row.vote_count : (parseInt(row.vote_count, 10) || 0),
            original_language: row.original_language !== null && row.original_language !== undefined ? row.original_language : '',
            overview: row.overview !== null && row.overview !== undefined ? row.overview : '',
            poster_path: row.poster_path !== undefined ? row.poster_path : null,
            backdrop_path: row.backdrop_path !== undefined ? row.backdrop_path : null,
            genres: Array.isArray(row.genres) ? row.genres : [],
            runtime: typeof row.runtime === 'number' && row.runtime >= 0 ? row.runtime : undefined,
            tagline: row.tagline !== null && row.tagline !== undefined ? row.tagline : undefined,
            status: row.status || 'Plan to Watch',
            personalRating: typeof row.personal_rating === 'number' ? row.personal_rating : (parseInt(row.personal_rating, 10) || 0),
            notes: row.notes !== null && row.notes !== undefined ? row.notes : '',
            dateAdded: row.date_added || new Date().toISOString()
        };
    },

    /**
     * Map an in-memory Movie object to a Supabase watchlist_items row payload
     */
    mapMovieToRow(userId, movie) {
        if (!userId) throw new Error('User ID is required for database operations.');
        if (!movie || typeof movie !== 'object') throw new Error('Valid movie object is required.');
        if (!this.isValidTmdbId(movie.id)) throw new Error(`Invalid TMDB ID: ${movie.id}. Must be a positive integer.`);

        let dateAddedIso;
        if (movie.dateAdded === undefined || movie.dateAdded === null || movie.dateAdded === '') {
            dateAddedIso = new Date().toISOString();
        } else {
            const parsed = new Date(movie.dateAdded);
            if (isNaN(parsed.getTime())) {
                throw new Error(`Invalid dateAdded value: "${movie.dateAdded}". Must be a valid date.`);
            }
            dateAddedIso = parsed.toISOString();
        }

        return {
            user_id: userId,
            tmdb_id: movie.id,
            title: movie.title !== null && movie.title !== undefined ? String(movie.title).trim() || 'Untitled Movie' : 'Untitled Movie',
            release_date: movie.release_date !== undefined ? movie.release_date : null,
            vote_average: typeof movie.vote_average === 'number' && !isNaN(movie.vote_average) ? movie.vote_average : (parseFloat(movie.vote_average) || 0),
            vote_count: typeof movie.vote_count === 'number' && !isNaN(movie.vote_count) ? movie.vote_count : (parseInt(movie.vote_count, 10) || 0),
            original_language: movie.original_language !== undefined ? movie.original_language : null,
            overview: movie.overview !== undefined ? movie.overview : null,
            poster_path: movie.poster_path !== undefined ? movie.poster_path : null,
            backdrop_path: movie.backdrop_path !== undefined ? movie.backdrop_path : null,
            genres: Array.isArray(movie.genres) ? movie.genres : [],
            runtime: typeof movie.runtime === 'number' && !isNaN(movie.runtime) && movie.runtime >= 0 ? movie.runtime : null,
            tagline: movie.tagline !== undefined ? movie.tagline : null,
            status: movie.status || 'Plan to Watch',
            personal_rating: typeof movie.personalRating === 'number' && !isNaN(movie.personalRating) ? movie.personalRating : (parseInt(movie.personalRating, 10) || 0),
            notes: movie.notes !== undefined && movie.notes !== null ? String(movie.notes) : '',
            date_added: dateAddedIso
        };
    },

    /**
     * Map a partial updates object to Supabase database column names.
     * Identity columns (id, tmdb_id) are strictly ignored and protected.
     */
    mapUpdatesToColumns(updates) {
        if (!updates || typeof updates !== 'object') return {};
        const columnMap = {};

        // Security: Do not allow partial updates to alter movie identity (tmdb_id)
        if (updates.title !== undefined) columnMap.title = updates.title;
        if (updates.release_date !== undefined) columnMap.release_date = updates.release_date;
        if (updates.vote_average !== undefined) columnMap.vote_average = updates.vote_average;
        if (updates.vote_count !== undefined) columnMap.vote_count = updates.vote_count;
        if (updates.original_language !== undefined) columnMap.original_language = updates.original_language;
        if (updates.overview !== undefined) columnMap.overview = updates.overview;
        if (updates.poster_path !== undefined) columnMap.poster_path = updates.poster_path;
        if (updates.backdrop_path !== undefined) columnMap.backdrop_path = updates.backdrop_path;
        if (updates.genres !== undefined) columnMap.genres = updates.genres;
        if (updates.runtime !== undefined) columnMap.runtime = updates.runtime;
        if (updates.tagline !== undefined) columnMap.tagline = updates.tagline;
        if (updates.status !== undefined) columnMap.status = updates.status;
        if (updates.personalRating !== undefined) columnMap.personal_rating = updates.personalRating;
        if (updates.personal_rating !== undefined) columnMap.personal_rating = updates.personal_rating;
        if (updates.notes !== undefined) columnMap.notes = updates.notes;
        
        if (updates.dateAdded !== undefined) {
            const parsed = new Date(updates.dateAdded);
            if (isNaN(parsed.getTime())) throw new Error(`Invalid dateAdded value: "${updates.dateAdded}"`);
            columnMap.date_added = parsed.toISOString();
        } else if (updates.date_added !== undefined) {
            const parsed = new Date(updates.date_added);
            if (isNaN(parsed.getTime())) throw new Error(`Invalid date_added value: "${updates.date_added}"`);
            columnMap.date_added = parsed.toISOString();
        }

        return columnMap;
    },

    /**
     * 1. Fetch all watchlist items for a user
     */
    async fetchUserWatchlist(userId) {
        if (!userId) {
            throw new Error('fetchUserWatchlist: userId is required');
        }
        if (!window.supabaseClient) {
            throw new Error('fetchUserWatchlist: Supabase client is not initialized');
        }

        const { data, error } = await window.supabaseClient
            .from('watchlist_items')
            .select(`
                id,
                user_id,
                tmdb_id,
                title,
                release_date,
                vote_average,
                vote_count,
                original_language,
                overview,
                poster_path,
                backdrop_path,
                genres,
                runtime,
                tagline,
                status,
                personal_rating,
                notes,
                date_added,
                updated_at
            `)
            .eq('user_id', userId)
            .order('date_added', { ascending: false });

        if (error) {
            console.error('fetchUserWatchlist Error:', error);
            throw error;
        }

        return (data || []).map(row => this.mapRowToMovie(row));
    },

    /**
     * 2. Upsert a complete movie record into the user's watchlist
     */
    async upsertWatchlistItem(userId, movie) {
        if (!userId) {
            throw new Error('upsertWatchlistItem: userId is required');
        }
        if (!movie || typeof movie !== 'object') {
            throw new Error('upsertWatchlistItem: valid movie object is required');
        }
        if (!this.isValidTmdbId(movie.id)) {
            throw new Error(`upsertWatchlistItem: Invalid TMDB ID "${movie.id}". Must be a positive integer.`);
        }
        if (!window.supabaseClient) {
            throw new Error('upsertWatchlistItem: Supabase client is not initialized');
        }

        const rowPayload = this.mapMovieToRow(userId, movie);

        const { data, error } = await window.supabaseClient
            .from('watchlist_items')
            .upsert(rowPayload, {
                onConflict: 'user_id,tmdb_id'
            })
            .select()
            .single();

        if (error) {
            console.error('upsertWatchlistItem Error:', error);
            throw error;
        }

        return this.mapRowToMovie(data);
    },

    /**
     * 3. Update specific fields of an existing watchlist item (e.g. metadata enrichment)
     */
    async updateWatchlistItem(userId, tmdbId, updates) {
        if (!userId) {
            throw new Error('updateWatchlistItem: userId is required');
        }
        if (!this.isValidTmdbId(tmdbId)) {
            throw new Error(`updateWatchlistItem: Invalid TMDB ID "${tmdbId}". Must be a positive integer.`);
        }
        if (!window.supabaseClient) {
            throw new Error('updateWatchlistItem: Supabase client is not initialized');
        }

        const columnUpdates = this.mapUpdatesToColumns(updates);
        if (Object.keys(columnUpdates).length === 0) {
            throw new Error('updateWatchlistItem: no valid update fields provided');
        }

        const { data, error } = await window.supabaseClient
            .from('watchlist_items')
            .update(columnUpdates)
            .eq('user_id', userId)
            .eq('tmdb_id', tmdbId)
            .select();

        if (error) {
            console.error('updateWatchlistItem Error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error(`updateWatchlistItem: No movie found matching tmdbId ${tmdbId} for this user.`);
        }

        return this.mapRowToMovie(data[0]);
    },

    /**
     * 4. Delete an item from the user's watchlist
     */
    async deleteWatchlistItem(userId, tmdbId) {
        if (!userId) {
            throw new Error('deleteWatchlistItem: userId is required');
        }
        if (!this.isValidTmdbId(tmdbId)) {
            throw new Error(`deleteWatchlistItem: Invalid TMDB ID "${tmdbId}". Must be a positive integer.`);
        }
        if (!window.supabaseClient) {
            throw new Error('deleteWatchlistItem: Supabase client is not initialized');
        }

        const { data, error } = await window.supabaseClient
            .from('watchlist_items')
            .delete()
            .eq('user_id', userId)
            .eq('tmdb_id', tmdbId)
            .select();

        if (error) {
            console.error('deleteWatchlistItem Error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error(`deleteWatchlistItem: No movie found with ID ${tmdbId} to delete.`);
        }

        return { success: true, deleted: data[0] };
    }
};

// Global Exposure
window.WatchlistDatabaseService = WatchlistDatabaseService;
window.DB = WatchlistDatabaseService;
