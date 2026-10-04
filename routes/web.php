<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
| Front end only for now: every page reads the sample data kept in the browser.
| When the back end arrives, these closures become controllers that pass real props.
*/

Route::inertia('/', 'home')->name('home');
Route::inertia('/explore', 'explore')->name('explore');
Route::get('/listings/{slug}', fn (string $slug) => Inertia::render('listing', ['slug' => $slug]))->name('listing');
Route::inertia('/checkout', 'checkout')->name('checkout');
Route::inertia('/join', 'join')->name('join');

Route::prefix('me')->name('me.')->group(function () {
    Route::inertia('/', 'me/profile')->name('profile');
    Route::inertia('/ambassador', 'me/ambassador')->name('ambassador');
});

Route::prefix('studio')->name('studio.')->group(function () {
    Route::inertia('/', 'studio/overview')->name('overview');
    Route::inertia('/listings', 'studio/listings')->name('listings');
    Route::inertia('/listings/new', 'studio/listing-wizard')->name('listings.new');
    Route::get('/listings/{id}/edit', fn (string $id) => Inertia::render('studio/listing-wizard', ['id' => $id]))->name('listings.edit');
    Route::inertia('/bookings', 'studio/bookings')->name('bookings');
    Route::inertia('/check-in', 'studio/check-in')->name('check-in');
    Route::inertia('/payouts', 'studio/payouts')->name('payouts');
});

Route::prefix('admin')->name('admin.')->group(function () {
    Route::inertia('/', 'admin/overview')->name('overview');
    Route::inertia('/approvals', 'admin/approvals')->name('approvals');
    Route::inertia('/listings', 'admin/listings')->name('listings');
    Route::inertia('/revenue', 'admin/revenue')->name('revenue');
    Route::inertia('/settings', 'admin/settings')->name('settings');
});

Route::fallback(fn () => Inertia::render('not-found')->toResponse(request())->setStatusCode(404));
