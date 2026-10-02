<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Raised when the one-time Google Places confirmation cannot complete
 * (missing API key, Google error, unknown place). Callers should fall back
 * to the manual pin path and tell the user.
 */
class PlacesUnavailableException extends RuntimeException
{
}
