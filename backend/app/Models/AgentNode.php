<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentNode extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'node_type',
        'status',
        'last_ip',
        'last_seen_at',
        'meta',
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
        'meta' => 'array',
    ];

    public function events()
    {
        return $this->hasMany(AgentEvent::class);
    }
}
