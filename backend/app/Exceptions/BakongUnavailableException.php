<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Raised when the Bakong KHQR flow cannot proceed (missing API key, gateway
 * error, unpaid invoice, or already-active subscription). Controllers map
 * this to a 4xx/5xx with a human-readable message.
 */
class BakongUnavailableException extends RuntimeException
{
}
