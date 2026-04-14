<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentEvent extends Model
{
    use HasFactory;

    protected $fillable = ['agent_node_id', 'event_type', 'payload', 'occurred_at'];

    protected $casts = [
        'payload' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function node()
    {
        return $this->belongsTo(AgentNode::class, 'agent_node_id');
    }
}
