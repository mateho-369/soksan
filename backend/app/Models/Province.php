<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Province extends Model
{
    protected $fillable = ['code', 'name', 'name_kh', 'icon'];

    public function districts(): HasMany
    {
        return $this->hasMany(District::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'geo_province_id');
    }
}
